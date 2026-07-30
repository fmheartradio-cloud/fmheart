import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  type NewsbotBlockReason,
  sourceUrlKey,
} from "@/lib/newsbot/blocklist";
import {
  decodeHtmlEntities,
  hasUndecodedHtmlEntities,
} from "@/lib/html-entities";
import {
  finalizeCoverUrl,
  isLikelyJunkCoverUrl,
  needsHigherQualityCover,
  pickBestCoverUrl,
  upgradeImageUrl,
} from "@/lib/image-url";
import {
  containsHtmlMarkup,
  looksLikeHtmlFragment,
  stripHtml,
  stripSyndicationFooter,
  toPlainExcerpt,
  toPlainText,
} from "@/lib/plain-text";
import {
  inferNewsCategory,
  mergeIngestTags,
  shouldUpgradeIngestedCategory,
} from "@/lib/newsbot/category";
import { shouldSkipNewsForCoverWatermark, shouldClearNethVideoPosterCover } from "@/lib/newsbot/watermark-detect";
import { hasSinhalaNewsText } from "@/lib/sinhala-script";
import {
  isNewsbotFacebookAutoPostEnabled,
  newsbotFacebookMaxPerRun,
  postFirestoreArticleToFacebook,
} from "@/lib/social/facebook";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type NewsSource = {
  id: string;
  name: string;
  /** Official RSS/Atom feed when available. */
  rss?: string;
  /** Homepage or section URL to scrape recent article links when RSS is unavailable. */
  listUrl?: string;
  category: string;
  active?: boolean;
};

export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: "nethnews",
    name: "Neth News",
    rss: "https://www.nethnews.lk/feed/",
    category: "දේශීය",
    active: true,
  },
  {
    id: "adaderana-sinhala",
    name: "Ada Derana Sinhala",
    rss: "https://sinhala.adaderana.lk/rsshotnews.php",
    category: "දේශීය",
    active: true,
  },
  {
    id: "lankaenews",
    name: "Lanka eNews",
    listUrl: "https://www.lankaenews.com/",
    category: "දේශීය",
    active: true,
  },
  {
    id: "lankahotnews",
    name: "Lanka Hot News",
    rss: "https://www.lankahotnews.net/rss.xml",
    category: "දේශීය",
    active: true,
  },
  {
    id: "citizen",
    name: "Citizen",
    rss: "https://www.citizen.lk/feed/",
    category: "දේශීය",
    active: true,
  },
  {
    id: "lankacnews",
    name: "Lanka C News",
    rss: "https://www.lankacnews.com/feeds/posts/default?alt=rss",
    category: "දේශීය",
    active: true,
  },
  {
    id: "lankadeepa",
    name: "Lankadeepa",
    rss: "https://www.lankadeepa.lk/rss/latest_news/1",
    category: "දේශීය",
    active: true,
  },
  {
    id: "divaina",
    name: "Divaina",
    rss: "https://www.divaina.lk/feed/",
    category: "දේශීය",
    active: true,
  },
];

type FeedItem = {
  title: string;
  sourceUrl: string;
  excerpt: string;
  body: string;
  coverImage: string;
  rssCategories: string[];
  /** True when the article HTML page was fetched successfully. */
  pageFetched?: boolean;
};

function slugify(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Date.now().toString(36);
  return ascii.length >= 3 ? `${ascii}-${suffix}` : `news-${suffix}`;
}

function sourceHash(sourceUrl: string, title: string): string {
  return createHash("sha256")
    .update(`${sourceUrl.trim().toLowerCase()}|${title.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 40);
}

function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

const NEWSBOT_USER_AGENT = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const MIN_BODY_CHARS = 280;
const MAX_BODY_CHARS = 10000;

function unwrapCdata(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  return match ? match[1] : trimmed;
}

function isImageMime(type: string): boolean {
  return /^image\//i.test(type.trim());
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$|#)/i.test(lower)) return true;
  if (/[?&](format|fm|f)=?(jpg|jpeg|png|webp|gif)/i.test(lower)) return true;
  return false;
}

function isLikelyVideoThumbnailUrl(url: string): boolean {
  if (!url) return false;
  return /ytimg|youtube|vimeo|dailymotion|jwplayer|maxresdefault|hqdefault|mqdefault|sddefault|video[-_/]?thumb|thumbnail[-_/]?video|poster[-_/]?frame|play[-_/]?overlay|\/embed\//i.test(
    url,
  );
}

function absolutizeUrl(url: string, ...bases: (string | undefined)[]): string {
  const trimmed = decodeHtmlEntities(url.trim());
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  for (const base of bases) {
    if (!base) continue;
    try {
      return new URL(trimmed, base).href;
    } catch {
      /* try next base */
    }
  }
  return trimmed;
}

function normalizeArticleUrl(raw: string): string {
  const trimmed = decodeHtmlEntities(raw.trim());
  if (!trimmed) return "";
  try {
    return new URL(trimmed).href;
  } catch {
    return trimmed;
  }
}

function normalizeCoverUrl(url: string): string {
  const abs = absolutizeUrl(url);
  if (!abs) return "";
  const https = abs.startsWith("http://")
    ? `https://${abs.slice("http://".length)}`
    : abs;
  return finalizeCoverUrl(https);
}

function coverNeedsPageFetch(cover: string): boolean {
  return needsHigherQualityCover(cover);
}

function extractItemLink(block: string): string {
  const inner = xmlTagInner(block, "link").trim();
  if (inner) return normalizeArticleUrl(stripHtml(inner));

  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLink?.[1]) return normalizeArticleUrl(atomLink[1]);

  const guid = xmlTagInner(block, "guid").trim();
  if (guid) return normalizeArticleUrl(stripHtml(guid));

  return "";
}

function extractRssCategories(block: string): string[] {
  const categories: string[] = [];
  for (const match of block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)) {
    const value = stripHtml(unwrapCdata(match[1])).trim();
    if (value) categories.push(value);
  }
  return categories;
}

function inferItemCategory(
  src: NewsSource,
  item: Pick<FeedItem, "sourceUrl" | "title" | "excerpt" | "rssCategories">,
): string {
  return inferNewsCategory({
    sourceId: src.id,
    sourceDefaultCategory: src.category,
    sourceUrl: item.sourceUrl,
    title: item.title,
    excerpt: item.excerpt,
    rssCategories: item.rssCategories,
  });
}

function xmlTagInner(block: string, tag: string): string {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(
    new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"),
  );
  return match?.[1] || "";
}

function imageFromHtmlFragment(
  html: string,
  itemLink: string,
  feedBase: string,
): string {
  const decoded = decodeHtmlEntities(unwrapCdata(html));
  const candidates: string[] = [];

  for (const match of decoded.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-original=["']([^"']+)["']/i)?.[1];
    if (
      !src ||
      /^data:/i.test(src) ||
      isJunkImageUrl(src) ||
      isLikelyVideoThumbnailUrl(src)
    )
      continue;

    const offset = match.index ?? 0;
    const local = decoded.slice(Math.max(0, offset - 220), offset + tag.length + 220);
    if (/youtube|ytimg|iframe|video|jwplayer|embed|play-button|video-player|wp-video/i.test(local))
      continue;

    const widthAttr = tag.match(/\bwidth=["']?(\d+)/i)?.[1];
    // Ada RSS thumbs are width=60 but still carry a usable S3 filename.
    const isAdaCdn = /adaderanasinhala/i.test(src);
    if (
      !isAdaCdn &&
      widthAttr &&
      Number(widthAttr) > 0 &&
      Number(widthAttr) < 200
    ) {
      continue;
    }

    const abs = absolutizeUrl(src, itemLink, feedBase);
    if (isImageUrl(abs) && !isLikelyVideoThumbnailUrl(abs)) candidates.push(abs);
  }

  return pickBestCoverUrl(...candidates);
}

function firstImageFromXml(
  block: string,
  itemLink: string,
  feedBase: string,
): string {
  const candidates: string[] = [];

  for (const match of block.matchAll(/<media:(?:content|thumbnail)[^>]*>/gi)) {
    const tag = match[0];
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1] || "";
    if (
      url &&
      (isImageMime(type) || isImageUrl(url)) &&
      !isLikelyVideoThumbnailUrl(url)
    ) {
      candidates.push(absolutizeUrl(url, itemLink, feedBase));
    }
  }

  for (const match of block.matchAll(/<enclosure[^>]*>/gi)) {
    const tag = match[0];
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1] || "";
    if (
      url &&
      (isImageMime(type) || isImageUrl(url)) &&
      !isLikelyVideoThumbnailUrl(url)
    ) {
      candidates.push(absolutizeUrl(url, itemLink, feedBase));
    }
  }

  for (const tag of ["description", "content:encoded"]) {
    const raw = xmlTagInner(block, tag);
    if (!raw) continue;
    const fromHtml = imageFromHtmlFragment(raw, itemLink, feedBase);
    if (fromHtml) candidates.push(fromHtml);
  }

  return normalizeCoverUrl(pickBestCoverUrl(...candidates));
}

function normalizeBodyText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function isBodyTooShort(body: string, title: string): boolean {
  const text = normalizeBodyText(body);
  if (text.length < MIN_BODY_CHARS) return true;
  const titleNorm = normalizeBodyText(title).toLowerCase();
  const bodyNorm = text.toLowerCase();
  if (bodyNorm === titleNorm) return true;
  if (
    titleNorm.length > 20 &&
    bodyNorm.startsWith(titleNorm) &&
    text.length < titleNorm.length + 80
  ) {
    return true;
  }
  if (jaccard(bodyNorm, titleNorm) >= 0.88) return true;
  return false;
}

function capBody(text: string): string {
  const trimmed = stripSourceAttribution(text);
  if (trimmed.length <= MAX_BODY_CHARS) return trimmed;
  const slice = trimmed.slice(0, MAX_BODY_CHARS);
  const lastBreak = slice.lastIndexOf("\n\n");
  return (lastBreak > MAX_BODY_CHARS * 0.6 ? slice.slice(0, lastBreak) : slice).trim();
}

/** Lankadeepa-style reporter line: "(පාලිත ආරියවංශ)" as its own paragraph. */
function isReporterByline(text: string): boolean {
  const t = text.trim();
  if (!/^\([^)\n]{2,80}\)$/u.test(t)) return false;
  const inner = t.slice(1, -1).trim();
  if (!inner) return false;
  // Real sentences in parens are longer / punctuated differently
  if (/[.!?…]/.test(inner) && inner.length > 45) return false;
  if (inner.split(/\s+/).filter(Boolean).length > 8) return false;
  return true;
}

/** Remove in-body source attribution; source/sourceUrl fields store provenance. */
function stripSourceAttribution(body: string): string {
  let text = body.trim();
  text = text.replace(
    /^\([\s\S]*?(?:ලංකා\s*ඊ\s*නිව්ස්|Lanka\s*e\s*News|LEN)[\s\S]*?\)\s*/iu,
    "",
  );
  // Lankadeepa / similar: leading "(Reporter Name)" byline
  text = text.replace(/^\(([^)\n]{2,80})\)\s*/u, (full, inner) =>
    isReporterByline(`(${inner})`) ? "" : full,
  );
  text = text.replace(/\n*(?:මූලාශ්‍ර|මුලාශ්‍ර|Source\s*:)[^\n]*/giu, "");
  return stripSyndicationFooter(text);
}

function bodyHasNethAttribution(body: string): boolean {
  return /appeared\s+first\s+on\s+Neth\s+News/i.test(body);
}

/** Lanka Hot News share CTA leaked into article body. */
function bodyHasShareCta(body: string): boolean {
  return (
    /මේ\s*පුවත\s*තව\s*අයට\s*බලන්න/u.test(body) ||
    (/Facebook\s*එකට\s*Share\s*කරන්න/u.test(body) &&
      /WhatsApp\s*එකට\s*Share\s*කරන්න/u.test(body))
  );
}

function bodyNeedsCleanup(body: string): boolean {
  return bodyHasNethAttribution(body) || bodyHasShareCta(body);
}

function stripInlineHtml(raw: string): string {
  let text = decodeHtmlEntities(raw);
  for (let pass = 0; pass < 3; pass += 1) {
    text = decodeHtmlEntities(
      text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " "),
    );
  }
  return text.trim();
}

function htmlFragmentToParagraphs(fragment: string): string {
  let html = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const paragraphs: string[] = [];
  for (const match of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const tag = match[0];
    if (/\breco-body\b/i.test(tag)) continue;
    if (/\badsbyvli\b/i.test(match[1])) continue;
    const text = stripInlineHtml(match[1]);
    if (
      text.length >= 20 &&
      !/^Reply To:/i.test(text) &&
      !isReporterByline(text)
    ) {
      paragraphs.push(text);
    }
  }
  if (paragraphs.length >= 1) {
    return paragraphs.join("\n\n");
  }
  return stripInlineHtml(html);
}

/** Slice HTML from an opening container tag until the first end marker. */
function extractContainerFragment(
  html: string,
  openPattern: RegExp,
  endMarkers: RegExp[],
): string {
  const openMatch = html.match(openPattern);
  if (!openMatch) return "";
  const startIdx = html.indexOf(openMatch[0]) + openMatch[0].length;
  let endIdx = html.length;
  const tail = html.slice(startIdx);
  for (const marker of endMarkers) {
    const hit = tail.match(marker);
    if (hit?.index !== undefined) {
      endIdx = Math.min(endIdx, startIdx + hit.index);
    }
  }
  return html.slice(startIdx, endIdx);
}

function bodyLooksLikeTitle(body: string, title: string): boolean {
  return isBodyTooShort(body, title);
}

function extractMetaDescription(html: string): string {
  const patterns = [
    /property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
    /name=["']description["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return stripInlineHtml(match[1]);
    }
  }
  return "";
}

function extractTitleFromHtml(html: string): string {
  const patterns = [
    /property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const title = stripInlineHtml(match[1])
        .replace(/\s*[|\-–—]\s*.*$/, "")
        .trim();
      if (title.length >= 4) return title;
    }
  }
  return "";
}

function extractJsonLdArticleBody(html: string): string {
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const body = (node as Record<string, unknown>).articleBody;
        if (typeof body === "string" && body.trim().length >= MIN_BODY_CHARS) {
          return htmlFragmentToParagraphs(body);
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return "";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function articleFetchUrl(sourceUrl: string): string {
  try {
    const page = new URL(normalizeArticleUrl(sourceUrl));
    const host = page.hostname.toLowerCase();
    if (
      (host.includes("bbc.com") || host.includes("bbc.co.uk")) &&
      page.pathname.includes("/articles/") &&
      !page.pathname.endsWith(".lite")
    ) {
      page.pathname = `${page.pathname.replace(/\/$/, "")}.lite`;
      return page.href;
    }
  } catch {
    /* use original URL */
  }
  return normalizeArticleUrl(sourceUrl);
}

function extractArticleBodyFromHtml(html: string, pageUrl: string): string {
  const host = hostOf(pageUrl);

  if (host.includes("ada.lk")) {
    // single-body-wrap nests share widgets; non-greedy </div> stops too early.
    const wrap = extractContainerFragment(
      html,
      /<div[^>]+class=["'][^"']*\bsingle-body-wrap\b[^"']*["'][^>]*>/i,
      [
        /<div[^>]+class=["'][^"']*\bsocial-media-icons\b/i,
        /<p class="text-uppercase mb-0 text-center">\s*popular news/i,
        /<div[^>]+class=["'][^"']*\bcomment-form\b/i,
      ],
    );
    if (wrap) {
      const text = htmlFragmentToParagraphs(wrap);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
  }

  if (host.includes("adaderana.lk")) {
    const prose = extractContainerFragment(
      html,
      /<div[^>]+class=["'][^"']*\bprose\b[^"']*["'][^>]*>/i,
      [
        /<div[^>]+class=["'][^"']*\b(related|share|comment|sidebar)\b/i,
        /<section[^>]+class=["'][^"']*\b(related|comment)\b/i,
      ],
    );
    if (prose) {
      const text = htmlFragmentToParagraphs(prose);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
    for (const match of html.matchAll(
      /<div[^>]+class=["'][^"']*\bnews-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    )) {
      const text = htmlFragmentToParagraphs(match[1]);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
  }

  if (host.includes("nethnews.lk")) {
    const wrap = extractContainerFragment(
      html,
      /<div[^>]+class=["'][^"']*\barticle-content-wrap\b[^"']*["'][^>]*>/i,
      [
        /<div[^>]+class=["'][^"']*\b(related|comment|sidebar|social)\b/i,
        /<section[^>]+class=["'][^"']*\b(related|comment)\b/i,
      ],
    );
    if (wrap) {
      const text = htmlFragmentToParagraphs(wrap);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
  }

  if (host.includes("newsfirst.lk")) {
    const details = extractContainerFragment(
      html,
      /<div[^>]+class=["'][^"']*\bnew_details\b[^"']*["'][^>]*>/i,
      [
        /<div[^>]+class=["'][^"']*\b(related|comment|sidebar|footer)\b/i,
        /<footer[\s>]/i,
      ],
    );
    if (details) {
      const text = htmlFragmentToParagraphs(details);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
  }

  if (host.includes("lankaenews.com")) {
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripInlineHtml(m[1]))
      .filter(
        (t) =>
          t.length >= 40 &&
          /[\u0D80-\u0DFF]/.test(t) &&
          !/^(?:මූලාශ්‍ර|මුලාශ්‍ර|Source\s*:)/i.test(t) &&
          !/^\([\s\S]*?(?:ලංකා\s*ඊ\s*නිව්ස්|LEN)/i.test(t),
      );
    const joined = paragraphs.join("\n\n");
    if (joined.length >= MIN_BODY_CHARS) return capBody(joined);
  }

  if (host.includes("lankahotnews.net")) {
    const bodyBlock =
      html.match(
        /<div[^>]+class=["'][^"']*\bpost-body\b[^"']*\bentry-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
      )?.[1] ||
      html.match(
        /<div[^>]+class=["'][^"']*\bentry-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )?.[1];
    if (bodyBlock) {
      const cleaned = bodyBlock
        .replace(/<div[^>]+class=["'][^"']*\bshare-box\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, " ")
        .replace(/<!--\s*SHARE[\s\S]*?<!--\s*SHARE SCRIPT\s*-->[\s\S]*?<\/script>/gi, " ")
        .replace(/මේ\s*පුවත\s*තව\s*අයට\s*බලන්න/giu, " ");
      const text = htmlFragmentToParagraphs(cleaned);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
  }

  if (host.includes("bbc.com") || host.includes("bbc.co.uk")) {
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripInlineHtml(m[1]))
      .filter(
        (t) =>
          t.length >= 40 &&
          !/BBC News|අවම ඩේටා|cookie|subscribe|privacy policy/i.test(t),
      );
    const joined = paragraphs.join("\n\n");
    if (joined.length >= MIN_BODY_CHARS) return capBody(joined);
  }

  const genericContainers = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*\bentry-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*\barticle-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*\bpost-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*\bstory-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["']text-contents["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of genericContainers) {
    const block = html.match(pattern)?.[1];
    if (!block) continue;
    const text = htmlFragmentToParagraphs(block);
    if (text.length >= MIN_BODY_CHARS) return capBody(text);
  }

  const jsonLd = extractJsonLdArticleBody(html);
  if (jsonLd) return capBody(jsonLd);

  const meta = extractMetaDescription(html);
  if (meta.length >= 80) return capBody(meta);

  return "";
}

type ArticlePageData = {
  /** Best cover for display (body photo when available). */
  coverImage: string;
  /** og:image / twitter card URL — often a branded share card on Ada.lk. */
  ogCoverImage: string;
  /** Extra in-article image candidates for unique-cover selection. */
  coverCandidates: string[];
  body: string;
  title: string;
  fetched: boolean;
};

const JUNK_IMAGE_RE =
  /logo|icon|avatar|pixel|spacer|1x1|tracking|badge|sprite|facebook|instagram|youtube|twitter|instagrame|advertising\.gif|lankahotnews\+advertising|pix\.png|lanka-e-news-log|new-year-\d{4}|outbrainimg|image_8df7de9e07\.png|\/images\/ads\//i;

const RELATED_SECTION_RE =
  /<(?:div|section|aside)[^>]+class=["'][^"']*\b(?:related|outbrain|reco|popular-posts|popular-news|more-news|you-may|td-related|jp-relatedposts|sidebar)\b/i;

const RELATED_CONTEXT_RE =
  /related|outbrain|reco-body|popular-posts|popular-news|more-news|you-may|td-related|jp-relatedposts|sidebar/i;

function isJunkImageUrl(url: string): boolean {
  return JUNK_IMAGE_RE.test(url);
}

/** Drop related / sidebar widgets that pollute article image extraction. */
function stripRelatedSections(block: string): string {
  return block.split(RELATED_SECTION_RE)[0] || block;
}

/**
 * Neth designed video posters are WP JPGs (not ytimg). Detect via pixels and clear.
 */
async function sanitizeCoverImage(
  cover: string,
  sourceUrl: string,
): Promise<string> {
  const finalized = finalizeCoverUrl(cover);
  if (!finalized) return "";
  if (isLikelyVideoThumbnailUrl(finalized)) return "";
  try {
    if (await shouldClearNethVideoPosterCover(finalized, sourceUrl)) {
      return "";
    }
  } catch {
    /* keep cover when poster detect fails */
  }
  return finalized;
}

/**
 * Prefer og → content → rss. Never keep YouTube thumbs or designed Neth video
 * posters — articles without a real photo cover are skipped/removed instead.
 */
async function pickSanitizedCover(
  rssCover: string,
  pageData: ArticlePageData | null,
  sourceUrl: string,
): Promise<string> {
  const pageCover = pageData?.coverImage || "";
  const ogCover = pageData?.ogCoverImage || "";

  const primary = await sanitizeCoverImage(
    resolveCoverImage(rssCover, pageCover, ogCover, sourceUrl),
    sourceUrl,
  );
  if (primary) return primary;

  if (pageCover) {
    const contentOnly = await sanitizeCoverImage(pageCover, sourceUrl);
    if (contentOnly) return contentOnly;
  }

  if (rssCover) {
    const rssOnly = await sanitizeCoverImage(rssCover, sourceUrl);
    if (rssOnly) return rssOnly;
  }

  return "";
}

/** Stable key so sized variants / path twins of the same file count as one cover. */
function coverIdentityKey(url: string): string {
  const finalized = finalizeCoverUrl(url);
  if (!finalized) return "";
  try {
    let path = new URL(finalized).pathname.toLowerCase();
    path = path.replace(
      /-\d+x\d+(?=\.(jpe?g|png|webp|gif|avif)$)/i,
      "",
    );
    // Filename only — Neth reuses stock files like COURT-1-1.jpg across months.
    return path.split("/").filter(Boolean).pop() || path;
  } catch {
    return finalized.toLowerCase();
  }
}

async function loadUsedCoverKeys(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  excludeDocId = "",
): Promise<Set<string>> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const used = new Set<string>();
  for (const doc of snap.docs) {
    if (excludeDocId && doc.id === excludeDocId) continue;
    const key = coverIdentityKey(String(doc.data().coverImage || ""));
    if (key) used.add(key);
  }
  return used;
}

/**
 * Pick a usable cover that is not already used by another published article.
 * Neth often reuses stock og:images (e.g. COURT-1-1.jpg) across many stories.
 */
async function pickUniqueSanitizedCover(
  rssCover: string,
  pageData: ArticlePageData | null,
  sourceUrl: string,
  usedKeys: Set<string>,
): Promise<string> {
  const rawCandidates: string[] = [];
  const push = (url: string) => {
    const t = url.trim();
    if (t) rawCandidates.push(t);
  };

  push(
    resolveCoverImage(
      rssCover,
      pageData?.coverImage || "",
      pageData?.ogCoverImage || "",
      sourceUrl,
    ),
  );
  push(pageData?.ogCoverImage || "");
  push(pageData?.coverImage || "");
  for (const c of pageData?.coverCandidates || []) push(c);
  push(rssCover);

  const seen = new Set<string>();
  for (const raw of rawCandidates) {
    const cover = await sanitizeCoverImage(raw, sourceUrl);
    if (!cover) continue;
    const key = coverIdentityKey(cover);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!usedKeys.has(key)) return cover;
  }

  return "";
}

/** True when cover is missing or is a video thumb / designed video poster. */
async function isUnusableCover(
  cover: string,
  sourceUrl: string,
): Promise<boolean> {
  const finalized = finalizeCoverUrl(cover);
  if (!finalized) return true;
  if (isLikelyVideoThumbnailUrl(finalized)) return true;
  try {
    return await shouldClearNethVideoPosterCover(finalized, sourceUrl);
  } catch {
    return false;
  }
}

async function blockNewsbotSource(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  opts: {
    sourceUrl: string;
    sourceHash?: string;
    title?: string;
    reason: NewsbotBlockReason;
  },
): Promise<void> {
  const url = opts.sourceUrl.trim();
  if (!url) return;
  await db
    .collection("newsbot_blocked")
    .doc(sourceUrlKey(url))
    .set(
      {
        sourceUrl: url,
        sourceHash: opts.sourceHash || null,
        title: opts.title || "",
        reason: opts.reason,
        blockedAt: new Date().toISOString(),
      },
      { merge: true },
    );
}

async function isNewsbotBlocked(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  sourceUrl: string,
  sourceHash = "",
): Promise<boolean> {
  const url = sourceUrl.trim();
  if (!url) return false;
  const byUrl = await db
    .collection("newsbot_blocked")
    .doc(sourceUrlKey(url))
    .get();
  if (byUrl.exists) return true;
  if (!sourceHash) return false;
  const byHash = await db
    .collection("newsbot_blocked")
    .where("sourceHash", "==", sourceHash)
    .limit(1)
    .get();
  return !byHash.empty;
}

async function deleteArticleAndBlock(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  doc: { ref: { delete: () => Promise<unknown> }; data: () => Record<string, unknown> },
  reason: NewsbotBlockReason,
): Promise<void> {
  const data = doc.data();
  const sourceUrl = String(data.sourceUrl || "").trim();
  if (sourceUrl) {
    await blockNewsbotSource(db, {
      sourceUrl,
      sourceHash: String(data.sourceHash || ""),
      title: String(data.title || ""),
      reason,
    });
  }
  await doc.ref.delete();
}

function isAdaHost(url: string): boolean {
  return hostOf(url).includes("ada.lk");
}

function isAdaDeranaHost(url: string): boolean {
  return hostOf(url).includes("adaderana.lk");
}

function isNethHost(url: string): boolean {
  return hostOf(url).includes("nethnews.lk");
}

function isLankadeepaHost(url: string): boolean {
  return hostOf(url).includes("lankadeepa.lk");
}

/**
 * Lankadeepa hero is the first image inside `.article-body` (og:image is a
 * site-wide logo / default share card on every story).
 */
function extractLankadeepaCoverImage(html: string, pageUrl: string): string {
  const body =
    html.match(
      /<div[^>]+class=["'][^"']*\barticle-body\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    )?.[1] || "";
  if (!body) return "";

  for (const match of body.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    if (!src || isJunkImageUrl(src) || isLikelyVideoThumbnailUrl(src)) continue;
    const abs = normalizeCoverUrl(
      absolutizeUrl(decodeHtmlEntities(src), pageUrl),
    );
    if (abs && isImageUrl(abs) && !isLikelyJunkCoverUrl(abs)) return abs;
  }
  return "";
}

/**
 * sinhala.adaderana.lk hero lives in `.news-banner` (often a real `_L` file
 * with a different id than og:image `_M`).
 */
function extractAdaDeranaCoverImage(html: string, pageUrl: string): string {
  const banner = html.match(
    /<div[^>]+class=["'][^"']*\bnews-banner\b[^"']*["'][^>]*>[\s\S]*?<img[^>]+src\s*=\s*["']([^"']+)["']/i,
  );
  if (banner?.[1]) {
    const abs = normalizeCoverUrl(
      absolutizeUrl(decodeHtmlEntities(banner[1]), pageUrl),
    );
    if (abs && isImageUrl(abs)) return abs;
  }

  const candidates: string[] = [];
  for (const match of html.matchAll(
    /https?:\/\/s3\.amazonaws\.com\/adaderanasinhala\/[^"'\\\s>]+\.(?:jpe?g|png|webp|gif|avif)/gi,
  )) {
    const abs = normalizeCoverUrl(match[0]);
    if (abs && isImageUrl(abs) && !isJunkImageUrl(abs)) candidates.push(abs);
  }

  const large = candidates.find((url) => /_L\.(jpe?g|png|webp|gif|avif)/i.test(url));
  if (large) return large;

  const full = candidates.find(
    (url) => !/_(?:S|M|t)\.(jpe?g|png|webp|gif|avif)/i.test(url),
  );
  return full || candidates[0] || "";
}

function extractOgImageFromHtml(html: string, pageUrl: string): string {
  const metaPatterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /property=["']og:image:url["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image:url["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
    /itemprop=["']image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*itemprop=["']image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i,
  ];
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const candidate = normalizeCoverUrl(
        absolutizeUrl(decodeHtmlEntities(match[1]), pageUrl),
      );
      if (
        candidate &&
        isImageUrl(candidate) &&
        !isLikelyVideoThumbnailUrl(candidate)
      ) {
        return candidate;
      }
    }
  }
  return "";
}

/** First real content photo from Ada single-body-wrap (skips share icons & related thumbs). */
function extractAdaArticleCoverImage(html: string, pageUrl: string): string {
  const wrap = extractContainerFragment(
    html,
    /<div[^>]+class=["'][^"']*\bsingle-body-wrap\b[^"']*["'][^>]*>/i,
    [
      /<div[^>]+class=["'][^"']*\bsocial-media-icons\b/i,
      /<p class="text-uppercase mb-0 text-center">\s*popular news/i,
      /<div[^>]+class=["'][^"']*\bcomment-form\b/i,
      /\breco-body\b/i,
    ],
  );
  if (!wrap) return "";

  const candidates: string[] = [];
  for (const match of wrap.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || /^data:/i.test(src) || isJunkImageUrl(src)) continue;

    const offset = match.index ?? 0;
    const local = wrap.slice(Math.max(0, offset - 220), offset + tag.length);
    if (/breaking_news|reco-body|related-news|popular news/i.test(local)) continue;

    const abs = normalizeCoverUrl(absolutizeUrl(decodeHtmlEntities(src), pageUrl));
    if (isImageUrl(abs)) candidates.push(abs);
  }

  const upload = candidates.find((url) =>
    /cdn\.ada\.lk\/assets\/uploads\/image_/i.test(url),
  );
  return upload || candidates[0] || "";
}

function shouldUpgradeAdaCover(
  existingCover: string,
  preferredCover: string,
  ogCover: string,
): boolean {
  if (!preferredCover || existingCover === preferredCover) return false;
  if (!ogCover) return false;
  const existingBase = existingCover.split("/").pop() || existingCover;
  const ogBase = ogCover.split("/").pop() || ogCover;
  return existingCover === ogCover || existingBase === ogBase;
}

function resolveCoverImage(
  rssCover: string,
  pageCover: string,
  ogCover: string,
  pageUrl: string,
): string {
  const rss = normalizeCoverUrl(rssCover);
  const page = normalizeCoverUrl(pageCover);
  const og = normalizeCoverUrl(ogCover);

  if (isAdaDeranaHost(pageUrl)) {
    // news-banner / page body photo beats og:_M (and never invent broken _L).
    if (page) return page;
    const adaBest = pickBestCoverUrl(og, rss);
    if (adaBest) return adaBest;
  }

  if (isAdaHost(pageUrl)) {
    if (page) {
      if (!rss) return page;
      if (shouldUpgradeAdaCover(rss, page, og)) return page;
    }
    const adaBest = pickBestCoverUrl(page, og, rss);
    if (adaBest) return adaBest;
  }

  if (isNethHost(pageUrl)) {
    // Always prefer og:image for Neth. In-article / content images are frequently
    // related-news thumbs shared across many stories (caused duplicate covers).
    return og || rss || page;
  }

  if (isLankadeepaHost(pageUrl)) {
    // og:image is a site-wide default brand card — never use it as the cover.
    return pickBestCoverUrl(rss, page) || rss || page;
  }

  // og:image share cards are usually the highest quality for our sources.
  const best = pickBestCoverUrl(og, page, rss);
  if (best) return best;
  if (og && needsHigherQualityCover(rss)) return og;
  if (page && needsHigherQualityCover(rss)) return page;
  return rss;
}

async function fetchArticlePageData(sourceUrl: string): Promise<ArticlePageData | null> {
  const pageUrl = articleFetchUrl(sourceUrl);
  if (!pageUrl) return null;

  let referer = "";
  try {
    referer = new URL(pageUrl).origin;
  } catch {
    /* ignore */
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": NEWSBOT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          ...(referer ? { Referer: referer } : {}),
        },
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(attempt === 0 ? 12000 : 18000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const ogCoverImage = extractOgImageFromHtml(html, pageUrl);
      const coverCandidates = collectContentImageCandidates(html, pageUrl);
      const coverImage =
        extractImageFromPageHtml(html, pageUrl, ogCoverImage) ||
        coverCandidates[0] ||
        "";
      const body = extractArticleBodyFromHtml(html, pageUrl);
      const title = extractTitleFromHtml(html);
      return {
        coverImage,
        ogCoverImage,
        coverCandidates,
        body,
        title,
        fetched: true,
      };
    } catch {
      /* retry once */
    }
  }
  return null;
}

function resolveArticleBody(item: FeedItem, title: string): string {
  for (const candidate of [item.body, item.excerpt]) {
    const text = candidate.trim();
    if (text && !bodyLooksLikeTitle(text, title)) {
      return capBody(text);
    }
  }
  if (item.pageFetched) {
    return capBody(item.body || item.excerpt || "");
  }
  return capBody(item.body || item.excerpt || title);
}

function collectContentImageCandidates(
  html: string,
  pageUrl: string,
): string[] {
  const containers = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*\b(?:entry-content|article-content|post-content|story-content|single-body-wrap|news-content|prose|article-body)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const pattern of containers) {
    const raw = html.match(pattern)?.[1];
    if (!raw) continue;
    const block = stripRelatedSections(raw);
    for (const match of block.matchAll(/<img[^>]+>/gi)) {
      const tag = match[0];
      const src =
        tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
        tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ||
        tag.match(/\bdata-original=["']([^"']+)["']/i)?.[1];
      if (
        !src ||
        /^data:/i.test(src) ||
        isJunkImageUrl(src) ||
        isLikelyVideoThumbnailUrl(src)
      )
        continue;

      const offset = match.index ?? 0;
      const local = block.slice(Math.max(0, offset - 220), offset + tag.length + 220);
      if (/youtube|ytimg|iframe|video|jwplayer|embed|play-button|video-player|wp-video/i.test(local))
        continue;
      if (RELATED_CONTEXT_RE.test(local)) continue;
      const abs = normalizeCoverUrl(absolutizeUrl(decodeHtmlEntities(src), pageUrl));
      if (!abs || !isImageUrl(abs) || isLikelyVideoThumbnailUrl(abs)) continue;
      const key = coverIdentityKey(abs);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      candidates.push(abs);
    }
  }

  return candidates;
}

function extractContentImageFromHtml(html: string, pageUrl: string): string {
  return pickBestCoverUrl(...collectContentImageCandidates(html, pageUrl));
}

function extractImageFromPageHtml(
  html: string,
  pageUrl: string,
  ogCoverImage = "",
): string {
  if (isAdaDeranaHost(pageUrl)) {
    const bannerImage = extractAdaDeranaCoverImage(html, pageUrl);
    if (bannerImage) return bannerImage;
  }

  if (isAdaHost(pageUrl)) {
    const bodyImage = extractAdaArticleCoverImage(html, pageUrl);
    if (bodyImage) return bodyImage;
  }

  if (isNethHost(pageUrl)) {
    // Keep content image separate from og — resolveCoverImage prefers og, and
    // pickSanitizedCover can fall back to content when og is a video poster.
    return extractContentImageFromHtml(html, pageUrl);
  }

  if (isLankadeepaHost(pageUrl)) {
    return (
      extractLankadeepaCoverImage(html, pageUrl) ||
      extractContentImageFromHtml(html, pageUrl)
    );
  }

  const og = ogCoverImage || extractOgImageFromHtml(html, pageUrl);
  if (og) return og;

  return extractContentImageFromHtml(html, pageUrl);
}

async function fetchCoverImageFromPage(sourceUrl: string): Promise<string> {
  const data = await fetchArticlePageData(sourceUrl);
  return data?.coverImage || "";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

function parseRssItems(xml: string, limit: number): FeedItem[] {
  const feedBase = stripHtml(xmlTagInner(xml.split(/<item[\s>]/i)[0], "link"));
  const items: FeedItem[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const chunk of chunks.slice(0, limit)) {
    const title = stripHtml(xmlTagInner(chunk, "title"));
    const link = extractItemLink(chunk);
    const descriptionRaw = unwrapCdata(xmlTagInner(chunk, "description"));
    const contentRaw = unwrapCdata(xmlTagInner(chunk, "content:encoded"));
    const description = stripHtml(descriptionRaw);
    const content = stripHtml(contentRaw);
    if (!title) continue;
    const body = (content || description || title).slice(0, 4000);
    items.push({
      title,
      sourceUrl: link,
      excerpt: toPlainExcerpt(description, body, 400) || title,
      body,
      coverImage: firstImageFromXml(chunk, link, feedBase),
      rssCategories: extractRssCategories(chunk),
    });
  }
  return items;
}

function parseNewsFirstList(html: string, limit: number): FeedItem[] {
  const base = "https://sinhala.newsfirst.lk";
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const match of html.matchAll(/href=["'](\/\d{4}\/\d{2}\/\d{2}\/[^"'#?]+)["']/gi)) {
    const path = match[1];
    if (seen.has(path)) continue;
    seen.add(path);
    items.push({
      title: "",
      sourceUrl: `${base}${path}`,
      excerpt: "",
      body: "",
      coverImage: "",
      rssCategories: [],
    });
    if (items.length >= limit) break;
  }
  return items;
}

function parseLankaENewsList(html: string, limit: number): FeedItem[] {
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const match of html.matchAll(/href=["']\/news\/(\d+)\/en["']/gi)) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      title: "",
      sourceUrl: `https://www.lankaenews.com/news/${id}/si`,
      excerpt: "",
      body: "",
      coverImage: "",
      rssCategories: [],
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function enrichFeedItemFromPage(item: FeedItem): Promise<FeedItem> {
  if (!item.sourceUrl) return item;
  const needsTitle = !item.title.trim();
  const needsCover = coverNeedsPageFetch(item.coverImage);
  const needsBody = isBodyTooShort(item.body, item.title || item.sourceUrl);
  if (!needsTitle && !needsCover && !needsBody) {
    return {
      ...item,
      coverImage: normalizeCoverUrl(item.coverImage),
    };
  }

  const pageData = await fetchArticlePageData(item.sourceUrl);
  if (!pageData) return item;

  const title = item.title.trim() || pageData.title.trim();
  return {
    ...item,
    title,
    pageFetched: pageData.fetched,
    coverImage: resolveCoverImage(
      item.coverImage,
      pageData.coverImage,
      pageData.ogCoverImage,
      item.sourceUrl,
    ),
    excerpt:
      toPlainExcerpt(item.excerpt, pageData.body, 400) ||
      toPlainExcerpt(title, pageData.body, 400) ||
      title,
    body:
      needsBody && pageData.body && !bodyLooksLikeTitle(pageData.body, title)
        ? pageData.body
        : item.body,
  };
}

async function fetchListPage(src: NewsSource, limit: number): Promise<FeedItem[]> {
  const listUrl = src.listUrl?.trim();
  if (!listUrl) return [];

  const res = await fetch(listUrl, {
    headers: {
      "User-Agent": NEWSBOT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`List ${res.status} for ${listUrl}`);
  const html = await res.text();

  let stubs: FeedItem[] = [];
  if (src.id === "newsfirst-sinhala") {
    stubs = parseNewsFirstList(html, limit);
  } else if (src.id === "lankaenews") {
    stubs = parseLankaENewsList(html, limit);
  } else {
    throw new Error(`No list parser for ${src.id}`);
  }

  return mapWithConcurrency(stubs, 3, enrichFeedItemFromPage);
}

async function fetchSourceItems(src: NewsSource, limit: number): Promise<FeedItem[]> {
  if (src.rss) return fetchRss(src.rss, limit);
  if (src.listUrl) return fetchListPage(src, limit);
  throw new Error(`Source ${src.id} has no rss or listUrl`);
}

async function fetchRss(url: string, limit: number): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": NEWSBOT_USER_AGENT,
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`RSS ${res.status} for ${url}`);
  const xml = await res.text();
  const items = parseRssItems(xml, limit);

  return mapWithConcurrency(items, 3, async (item) => {
    if (!item.sourceUrl) return item;
    const needsCover = coverNeedsPageFetch(item.coverImage);
    const needsBody =
      isBodyTooShort(item.body, item.title) ||
      containsHtmlMarkup(item.body);
    const needsExcerpt =
      containsHtmlMarkup(item.excerpt) ||
      looksLikeHtmlFragment(item.excerpt) ||
      /<img\b/i.test(item.excerpt);
    if (!needsCover && !needsBody && !needsExcerpt) {
      return {
        ...item,
        coverImage: normalizeCoverUrl(item.coverImage),
      };
    }

    const pageData = await fetchArticlePageData(item.sourceUrl);
    if (!pageData) {
      return {
        ...item,
        coverImage: normalizeCoverUrl(item.coverImage),
      };
    }

    const body =
      needsBody && pageData.body && !bodyLooksLikeTitle(pageData.body, item.title)
        ? pageData.body
        : containsHtmlMarkup(item.body)
          ? toPlainText(pageData.body || item.body)
          : item.body;

    return {
      ...item,
      pageFetched: pageData.fetched,
      coverImage: resolveCoverImage(
        item.coverImage,
        pageData.coverImage,
        pageData.ogCoverImage,
        item.sourceUrl,
      ),
      excerpt: toPlainExcerpt(item.excerpt, body, 400) || item.title,
      body,
    };
  });
}

function jaccard(a: string, b: string): number {
  const A = new Set(a.split(/\s+/).filter(Boolean));
  const B = new Set(b.split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export type IngestResult = {
  source: string;
  fetched: number;
  created: number;
  skipped: number;
  backfilled: number;
  publishedDrafts: number;
  categoriesUpdated: number;
  error?: string;
};

export async function runNewsIngest(options?: {
  maxPerSource?: number;
  sources?: NewsSource[];
}): Promise<{
  ok: boolean;
  results: IngestResult[];
  createdIds: string[];
  facebookPosted: number;
  facebookSkipped: number;
  facebookErrors: number;
}> {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.",
    );
  }
  const adminDb = db;

  const maxPerSource = options?.maxPerSource ?? 8;
  const sources = (options?.sources ?? DEFAULT_NEWS_SOURCES).filter(
    (s) => s.active !== false,
  );
  const results: IngestResult[] = [];
  const createdIds: string[] = [];
  let facebookPosted = 0;
  let facebookSkipped = 0;
  let facebookErrors = 0;
  const fbEnabled = isNewsbotFacebookAutoPostEnabled();
  const fbMax = newsbotFacebookMaxPerRun();

  async function maybePostFacebook(
    articleId: string,
    data: Record<string, unknown>,
  ) {
    if (!fbEnabled) {
      facebookSkipped += 1;
      return;
    }
    if (facebookPosted >= fbMax) {
      facebookSkipped += 1;
      return;
    }
    try {
      const result = await postFirestoreArticleToFacebook({
        articleId,
        data,
        update: async (fields) => {
          await adminDb.collection("articles").doc(articleId).set(fields, {
            merge: true,
          });
        },
      });
      if ("skipped" in result && result.skipped) {
        facebookSkipped += 1;
        return;
      }
      if (!result.ok) {
        facebookErrors += 1;
        console.warn("[newsbot/facebook]", articleId, result.error);
        return;
      }
      facebookPosted += 1;
      // Soft rate limit — avoid blasting the Page
      await sleep(1500);
    } catch (err) {
      facebookErrors += 1;
      console.warn("[newsbot/facebook]", articleId, err);
    }
  }

  const recentSnap = await db
    .collection("articles")
    .orderBy("createdAt", "desc")
    .limit(80)
    .get()
    .catch(() => null);
  const recentTitles = (recentSnap?.docs ?? []).map((d) =>
    String(d.data().title || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " "),
  );
  const usedCoverKeys = await loadUsedCoverKeys(db);

  for (const src of sources) {
    const row: IngestResult = {
      source: src.name,
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
    };
    try {
      const items = await fetchSourceItems(src, maxPerSource);
      row.fetched = items.length;

      for (const item of items) {
        const title = item.title.trim();
        if (!title) {
          row.skipped += 1;
          continue;
        }
        if (!hasSinhalaNewsText(title, item.excerpt)) {
          row.skipped += 1;
          continue;
        }

        const hash = sourceHash(item.sourceUrl, title);
        if (await isNewsbotBlocked(db, item.sourceUrl, hash)) {
          row.skipped += 1;
          continue;
        }

        const dupHash = await db
          .collection("articles")
          .where("sourceHash", "==", hash)
          .limit(1)
          .get();
        if (!dupHash.empty) {
          const existing = dupHash.docs[0];
          const existingData = existing.data();
          const existingExcerpt = String(existingData.excerpt || "").trim();
          const existingCover = String(existingData.coverImage || "").trim();
          const existingBody = String(existingData.body || "").trim();
          const needsCover =
            !existingCover ||
            (await isUnusableCover(existingCover, item.sourceUrl));
          const needsBody =
            bodyLooksLikeTitle(existingBody, title) ||
            containsHtmlMarkup(existingBody) ||
            bodyNeedsCleanup(existingBody);
          const needsEntityFix = hasUndecodedHtmlEntities(existingBody);
          const needsExcerptFix =
            containsHtmlMarkup(existingExcerpt) ||
            hasUndecodedHtmlEntities(existingExcerpt) ||
            looksLikeHtmlFragment(existingExcerpt) ||
            /<img\b/i.test(existingExcerpt);
          const needsCoverUpgrade =
            Boolean(existingCover) &&
            !needsCover &&
            (needsHigherQualityCover(existingCover) ||
              upgradeImageUrl(existingCover) !== existingCover);
          const adaCoverUpgrade =
            Boolean(existingCover) &&
            !needsCover &&
            (isAdaHost(item.sourceUrl) || isAdaDeranaHost(item.sourceUrl));
          const needsAdaCoverRestore =
            needsCover && isAdaDeranaHost(item.sourceUrl);
          const updates: Record<string, string | number | string[]> = {};

          let pageData: ArticlePageData | null = null;
          if (
            item.sourceUrl &&
            (needsCover ||
              needsAdaCoverRestore ||
              needsBody ||
              needsEntityFix ||
              needsExcerptFix ||
              needsCoverUpgrade ||
              adaCoverUpgrade)
          ) {
            pageData = await fetchArticlePageData(item.sourceUrl);
          }

          if (needsCover || needsAdaCoverRestore) {
            const selfKey = coverIdentityKey(existingCover);
            if (selfKey) usedCoverKeys.delete(selfKey);
            const finalized = await pickUniqueSanitizedCover(
              item.coverImage,
              pageData,
              item.sourceUrl,
              usedCoverKeys,
            );
            if (finalized) {
              updates.coverImage = finalized;
              usedCoverKeys.add(coverIdentityKey(finalized));
            } else {
              await deleteArticleAndBlock(db, existing, "no_cover");
              row.skipped += 1;
              continue;
            }
          } else if (needsCoverUpgrade || (adaCoverUpgrade && isAdaDeranaHost(item.sourceUrl))) {
            const selfKey = coverIdentityKey(existingCover);
            if (selfKey) usedCoverKeys.delete(selfKey);
            const upgraded = await pickUniqueSanitizedCover(
              existingCover,
              pageData,
              item.sourceUrl,
              usedCoverKeys,
            );
            if (upgraded && upgraded !== existingCover) {
              updates.coverImage = upgraded;
              usedCoverKeys.add(coverIdentityKey(upgraded));
            } else if (selfKey) {
              usedCoverKeys.add(selfKey);
            }
          } else if (
            adaCoverUpgrade &&
            pageData?.coverImage &&
            shouldUpgradeAdaCover(
              existingCover,
              pageData.coverImage,
              pageData.ogCoverImage,
            )
          ) {
            const finalized = await sanitizeCoverImage(
              pageData.coverImage,
              item.sourceUrl,
            );
            const key = coverIdentityKey(finalized);
            if (finalized && key && !usedCoverKeys.has(key)) {
              updates.coverImage = finalized;
              const selfKey = coverIdentityKey(existingCover);
              if (selfKey) usedCoverKeys.delete(selfKey);
              usedCoverKeys.add(key);
            }
          }

          if (needsExcerptFix) {
            const bodyPlain = toPlainText(
              String(updates.body || existingBody || item.body),
            );
            const fixedExcerpt =
              toPlainExcerpt(existingExcerpt, bodyPlain, 400) ||
              toPlainExcerpt(undefined, bodyPlain, 400) ||
              title;
            if (fixedExcerpt !== existingExcerpt) {
              updates.excerpt = fixedExcerpt;
              updates.seoDescription = fixedExcerpt;
            }
          }

          if (needsBody) {
            let fullerBody = toPlainText(item.body);
            if (bodyLooksLikeTitle(fullerBody, title)) {
              fullerBody = pageData?.body || fullerBody;
            }
            fullerBody = stripSourceAttribution(fullerBody);
            const cleanedExisting = stripSourceAttribution(existingBody);
            if (
              bodyNeedsCleanup(existingBody) &&
              cleanedExisting &&
              cleanedExisting !== existingBody &&
              !bodyLooksLikeTitle(cleanedExisting, title)
            ) {
              updates.body = capBody(cleanedExisting);
              updates.readingTimeMin = readingTime(String(updates.body));
            } else if (
              fullerBody &&
              fullerBody.length > existingBody.length &&
              !bodyLooksLikeTitle(fullerBody, title)
            ) {
              updates.body = capBody(fullerBody);
              updates.readingTimeMin = readingTime(String(updates.body));
            } else if (
              pageData?.body &&
              !bodyLooksLikeTitle(pageData.body, title) &&
              pageData.body.length > existingBody.length
            ) {
              updates.body = capBody(pageData.body);
              updates.readingTimeMin = readingTime(String(updates.body));
            } else if (containsHtmlMarkup(existingBody) || bodyNeedsCleanup(existingBody)) {
              const fixedBody = stripSourceAttribution(toPlainText(existingBody));
              if (fixedBody && fixedBody !== existingBody) {
                updates.body = capBody(fixedBody);
                updates.readingTimeMin = readingTime(String(updates.body));
              }
            }
          } else if (needsEntityFix) {
            const fixedBody = decodeHtmlEntities(existingBody);
            if (fixedBody !== existingBody) {
              updates.body = capBody(fixedBody);
              updates.readingTimeMin = readingTime(String(updates.body));
            } else if (
              pageData?.body &&
              !bodyLooksLikeTitle(pageData.body, title) &&
              pageData.body.length >= existingBody.length
            ) {
              updates.body = capBody(pageData.body);
              updates.readingTimeMin = readingTime(String(updates.body));
            }
          }

          const inferredCategory = inferItemCategory(src, item);
          const existingCategory = String(existingData.category || "").trim();
          if (
            shouldUpgradeIngestedCategory(
              existingCategory,
              src.category,
              inferredCategory,
            )
          ) {
            updates.category = inferredCategory;
            updates.tags = mergeIngestTags(
              existingData.tags,
              src.name,
              src.category,
              inferredCategory,
            );
          }

          if (
            existingData.ingestedBy === "newsbot" &&
            existingData.status === "draft"
          ) {
            updates.status = "published";
            updates.publishedAt = new Date().toISOString();
          }

          const existingAuthor = String(existingData.author || "").trim();
          if (
            existingData.ingestedBy === "newsbot" &&
            existingAuthor.startsWith("FM Heart ·") &&
            existingAuthor !== "FM Heart"
          ) {
            updates.author = "FM Heart";
          }

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date().toISOString();
            await existing.ref.update(updates);
            row.backfilled += 1;
            if ("status" in updates) {
              row.publishedDrafts += 1;
              await maybePostFacebook(existing.id, {
                ...existingData,
                ...updates,
                status: "published",
              });
            }
            if ("category" in updates) row.categoriesUpdated += 1;
          }
          row.skipped += 1;
          continue;
        }

        const needle = title.toLowerCase().replace(/\s+/g, " ");
        const similar = recentTitles.some(
          (t) => t === needle || jaccard(t, needle) >= 0.9,
        );
        if (similar) {
          row.skipped += 1;
          continue;
        }

        const body = resolveArticleBody(item, title);
        const category = inferItemCategory(src, item);
        const excerpt = toPlainExcerpt(item.excerpt, body, 400) || title;

        let pageData: ArticlePageData | null = null;
        if (item.sourceUrl) {
          pageData = await fetchArticlePageData(item.sourceUrl);
        }
        const coverImage = await pickUniqueSanitizedCover(
          item.coverImage,
          pageData,
          item.sourceUrl,
          usedCoverKeys,
        );

        // No unique real cover photo → do not publish this news.
        if (!coverImage) {
          row.skipped += 1;
          continue;
        }

        // Ada Derana CDN stills always have burnt-in ADA/අද දෙරණ watermarks.
        if (/adaderanasinhala|cdn\.ada\.lk/i.test(coverImage)) {
          row.skipped += 1;
          continue;
        }

        // Reject covers that already 404 (avoids identical FM Heart placeholders).
        if (!(await coverUrlLooksReachable(coverImage))) {
          row.skipped += 1;
          continue;
        }

        // Ada Derana (etc.) covers with burnt-in brand watermark → skip that news only.
        if (
          await shouldSkipNewsForCoverWatermark(coverImage, item.sourceUrl)
        ) {
          row.skipped += 1;
          continue;
        }

        usedCoverKeys.add(coverIdentityKey(coverImage));

        const now = new Date().toISOString();
        const slug = slugify(title);
        const payload = {
          type: "news" as const,
          title,
          slug,
          excerpt,
          body: toPlainText(body),
          category,
          coverImage,
          author: "FM Heart",
          status: "published" as const,
          tags: [src.name, category],
          readingTimeMin: readingTime(body),
          views: 0,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
          seoTitle: title,
          seoDescription: excerpt,
          source: src.name,
          sourceUrl: item.sourceUrl,
          sourceHash: hash,
          ingestedBy: "newsbot" as const,
        };
        const ref = await db.collection("articles").add(payload);

        createdIds.push(ref.id);
        recentTitles.unshift(needle);
        row.created += 1;
        await maybePostFacebook(ref.id, payload);
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err);
    }
    results.push(row);
  }

  // Restore/remove covers that 404 in the browser (e.g. mangled -350.jpg Neth URLs).
  try {
    const brokenFixed = await cleanupBrokenCoverUrls(db);
    results.push({
      source: "Broken cover cleanup",
      fetched: brokenFixed,
      created: 0,
      skipped: 0,
      backfilled: brokenFixed,
      publishedDrafts: 0,
      categoriesUpdated: 0,
    });
  } catch (err) {
    results.push({
      source: "Broken cover cleanup",
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Delete already-published Ada Derana items whose covers carry the brand watermark.
  try {
    const removed = await removeWatermarkedAdaArticles(db);
    results.push({
      source: "Ada watermark cleanup",
      fetched: removed,
      created: 0,
      skipped: removed,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
    });
  } catch (err) {
    results.push({
      source: "Ada watermark cleanup",
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Clean already-published covers that are actually video thumbnails.
  try {
    const fixedVideoThumbs = await cleanupVideoThumbnailCovers(db);
    results.push({
      source: "Video thumbnail cleanup",
      fetched: fixedVideoThumbs,
      created: 0,
      skipped: 0,
      backfilled: fixedVideoThumbs,
      publishedDrafts: 0,
      categoriesUpdated: 0,
    });
  } catch (err) {
    results.push({
      source: "Video thumbnail cleanup",
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Re-tune recent Neth covers (restore photos; clear designed video posters).
  try {
    const retunedNeth = await retuneNethCovers(db);
    results.push({
      source: "Neth cover retune",
      fetched: retunedNeth,
      created: 0,
      skipped: 0,
      backfilled: retunedNeth,
      publishedDrafts: 0,
      categoriesUpdated: 0,
    });
  } catch (err) {
    results.push({
      source: "Neth cover retune",
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Split packs of articles that all show the same related-news thumb.
  try {
    const deduped = await dedupeSharedNethCovers(db);
    results.push({
      source: "Shared cover dedupe",
      fetched: deduped,
      created: 0,
      skipped: 0,
      backfilled: deduped,
      publishedDrafts: 0,
      categoriesUpdated: 0,
    });
  } catch (err) {
    results.push({
      source: "Shared cover dedupe",
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
      publishedDrafts: 0,
      categoriesUpdated: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    ok: true,
    results,
    createdIds,
    facebookPosted,
    facebookSkipped,
    facebookErrors,
  };
}

async function coverUrlLooksReachable(url: string): Promise<boolean> {
  const target = url.trim();
  if (!target || !/^https?:\/\//i.test(target)) return false;
  try {
    const head = await fetch(target, {
      method: "HEAD",
      headers: {
        "User-Agent": NEWSBOT_USER_AGENT,
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (head.ok) {
      const type = (head.headers.get("content-type") || "").toLowerCase();
      if (type.includes("text/html")) return false;
      if (!type || type.startsWith("image/") || type.includes("octet-stream")) {
        return true;
      }
    }
  } catch {
    /* fall through to ranged GET */
  }

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": NEWSBOT_USER_AGENT,
        Accept: "image/*,*/*;q=0.8",
        Range: "bytes=0-1023",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!(res.ok || res.status === 206)) return false;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html")) return false;
    return !type || type.startsWith("image/") || type.includes("octet-stream");
  } catch {
    return false;
  }
}

/** Restore or remove published articles whose cover URL 404s / is not an image. */
async function cleanupBrokenCoverUrls(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<number> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(80)
    .get();

  const usedKeys = await loadUsedCoverKeys(db);
  let fixed = 0;

  for (const doc of snap.docs) {
    try {
      const data = doc.data();
      if (String(data.type || "news") !== "news") continue;
      const existingCover = String(data.coverImage || "").trim();
      const sourceUrl = String(data.sourceUrl || "").trim();
      const finalized = finalizeCoverUrl(existingCover);

      const needsCheck =
        !finalized ||
        !(await coverUrlLooksReachable(finalized || existingCover));
      if (!needsCheck) continue;

      const selfKey = coverIdentityKey(finalized || existingCover);
      if (selfKey) usedKeys.delete(selfKey);

      let next = "";
      if (sourceUrl) {
        const pageData = await fetchArticlePageData(sourceUrl);
        next = await pickUniqueSanitizedCover(
          "",
          pageData,
          sourceUrl,
          usedKeys,
        );
      }

      if (next && (await coverUrlLooksReachable(next))) {
        usedKeys.add(coverIdentityKey(next));
        await doc.ref.update({
          coverImage: next,
          updatedAt: new Date().toISOString(),
        });
        fixed += 1;
        continue;
      }

      // No working cover — remove from public site.
      await doc.ref.delete();
      fixed += 1;
    } catch {
      /* continue */
    }
  }

  return fixed;
}

async function removeWatermarkedAdaArticles(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<number> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const candidates = snap.docs.filter((doc) => {
    const data = doc.data();
    const cover = String(data.coverImage || "").trim();
    const sourceUrl = String(data.sourceUrl || "").trim();
    const source = String(data.source || "");
    if (!cover) return false;
    return (
      source === "Ada Derana Sinhala" ||
      /adaderana|adaderanasinhala|cdn\.ada\.lk/i.test(`${cover} ${sourceUrl}`)
    );
  });

  const flags = await mapWithConcurrency(candidates, 4, async (doc) => {
    try {
      const data = doc.data();
      const cover = String(data.coverImage || "").trim();
      const sourceUrl = String(data.sourceUrl || "").trim();
      if (!cover) return false;

      // Hard sync rule first — do not rely only on async pixel heuristics.
      const watermarked =
        /adaderanasinhala|cdn\.ada\.lk/i.test(cover) ||
        (await shouldSkipNewsForCoverWatermark(cover, sourceUrl));
      if (!watermarked) return false;

      await deleteArticleAndBlock(db, doc, "watermark");
      return true;
    } catch {
      return false;
    }
  });

  return flags.filter(Boolean).length;
}

async function cleanupVideoThumbnailCovers(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<number> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(120)
    .get();

  const candidates = snap.docs.filter((doc) => {
    const data = doc.data();
    const cover = String(data.coverImage || "").trim();
    const sourceUrl = String(data.sourceUrl || "").trim();
    if (!sourceUrl) return !cover;
    // Designed Neth video posters are WP uploads — always re-check recent Neth
    // (including blank covers left by the previous over-clear).
    if (isNethHost(sourceUrl) || /nethnews/i.test(sourceUrl)) return true;
    if (!cover) return true;
    return isLikelyVideoThumbnailUrl(cover);
  });

  const flags = await mapWithConcurrency(candidates, 3, async (doc) => {
    try {
      const data = doc.data();
      const existingCover = String(data.coverImage || "").trim();
      const sourceUrl = String(data.sourceUrl || "").trim();

      let replacement = "";
      if (sourceUrl) {
        const pageData = await fetchArticlePageData(sourceUrl);
        replacement = await pickSanitizedCover("", pageData, sourceUrl);
      }

      if (replacement) {
        if (replacement === existingCover) return false;
        await doc.ref.update({
          coverImage: replacement,
          updatedAt: new Date().toISOString(),
        });
        return true;
      }

      // No real cover available — remove from site (and block re-ingest).
      if (await isUnusableCover(existingCover, sourceUrl)) {
        const reason: NewsbotBlockReason =
          !finalizeCoverUrl(existingCover)
            ? "no_cover"
            : "video_cover";
        await deleteArticleAndBlock(db, doc, reason);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  });

  return flags.filter(Boolean).length;
}

async function retuneNethCovers(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<number> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(150)
    .get();

  const nethDocs = snap.docs.filter((doc) => {
    const data = doc.data();
    const sourceUrl = String(data.sourceUrl || "");
    const source = String(data.source || "");
    return (
      source === "Neth News" ||
      isNethHost(sourceUrl) ||
      /nethnews/i.test(sourceUrl)
    );
  });

  const flags = await mapWithConcurrency(nethDocs, 3, async (doc) => {
    try {
      const data = doc.data();
      const sourceUrl = String(data.sourceUrl || "").trim();
      if (!sourceUrl) return false;
      const existingCover = String(data.coverImage || "").trim();

      const pageData = await fetchArticlePageData(sourceUrl);
      if (!pageData) {
        if (await isUnusableCover(existingCover, sourceUrl)) {
          await deleteArticleAndBlock(db, doc, "no_cover");
          return true;
        }
        return false;
      }

      const tuned = await pickSanitizedCover("", pageData, sourceUrl);
      if (!tuned) {
        if (await isUnusableCover(existingCover, sourceUrl)) {
          await deleteArticleAndBlock(db, doc, "video_cover");
          return true;
        }
        return false;
      }
      if (tuned === existingCover) return false;

      await doc.ref.update({
        coverImage: tuned,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  });

  return flags.filter(Boolean).length;
}

/** One published article per cover image — split shared stock thumbs. */
async function dedupeSharedNethCovers(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<number> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const byCover = new Map<string, typeof snap.docs>();
  for (const doc of snap.docs) {
    const cover = String(doc.data().coverImage || "").trim();
    const key = coverIdentityKey(cover);
    if (!key) continue;
    const list = byCover.get(key) || [];
    list.push(doc);
    byCover.set(key, list);
  }

  const usedKeys = await loadUsedCoverKeys(db);
  let fixed = 0;

  for (const [sharedKey, docs] of byCover) {
    if (docs.length < 2) continue;

    // Newest keeps the shared cover; older ones must get a unique image or go.
    const keeper = docs[0];
    const keeperCover = String(keeper.data().coverImage || "").trim();
    usedKeys.add(coverIdentityKey(keeperCover) || sharedKey);

    for (const doc of docs.slice(1)) {
      const sourceUrl = String(doc.data().sourceUrl || "").trim();

      let next = "";
      if (sourceUrl) {
        const pageData = await fetchArticlePageData(sourceUrl);
        // Keep sharedKey in usedKeys so we never re-assign the same stock thumb.
        next = await pickUniqueSanitizedCover(
          "",
          pageData,
          sourceUrl,
          usedKeys,
        );
      }

      if (next) {
        usedKeys.add(coverIdentityKey(next));
        await doc.ref.update({
          coverImage: next,
          updatedAt: new Date().toISOString(),
        });
        fixed += 1;
        continue;
      }

      // No unique cover available — remove duplicate rather than show same thumb.
      // Do not blocklist: if the keeper is later removed, a fresh unique ingest can return.
      await doc.ref.delete();
      fixed += 1;
    }
  }

  return fixed;
}
