import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasSinhalaNewsText } from "@/lib/sinhala-script";

export type NewsSource = {
  id: string;
  name: string;
  rss: string;
  category: string;
  active?: boolean;
};

export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: "ada-lk",
    name: "Ada",
    rss: "https://www.ada.lk/rss/latest_news/1",
    category: "දේශීය",
    active: true,
  },
  {
    id: "adaderana",
    name: "Ada Derana",
    rss: "https://www.adaderana.lk/rss.php",
    category: "දේශීය",
    active: true,
  },
  {
    id: "bbc-sinhala",
    name: "BBC Sinhala",
    rss: "https://feeds.bbci.co.uk/sinhala/rss.xml",
    category: "ජාත්‍යන්තර",
    active: true,
  },
];

type FeedItem = {
  title: string;
  sourceUrl: string;
  excerpt: string;
  body: string;
  coverImage: string;
};

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

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
/** Bodies at or above this length are treated as admin-edited / full — skip backfill. */
const ADMIN_BODY_MIN_CHARS = 500;

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

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
  if (abs.startsWith("http://")) return `https://${abs.slice("http://".length)}`;
  return abs;
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
  for (const match of decoded.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (!src || /^data:/i.test(src)) continue;
    const abs = absolutizeUrl(src, itemLink, feedBase);
    if (isImageUrl(abs)) return abs;
  }
  return "";
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
    if (url && (isImageMime(type) || isImageUrl(url))) {
      candidates.push(absolutizeUrl(url, itemLink, feedBase));
    }
  }

  for (const match of block.matchAll(/<enclosure[^>]*>/gi)) {
    const tag = match[0];
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1] || "";
    if (url && (isImageMime(type) || isImageUrl(url))) {
      candidates.push(absolutizeUrl(url, itemLink, feedBase));
    }
  }

  for (const tag of ["description", "content:encoded"]) {
    const raw = xmlTagInner(block, tag);
    if (!raw) continue;
    const fromHtml = imageFromHtmlFragment(raw, itemLink, feedBase);
    if (fromHtml) candidates.push(fromHtml);
  }

  const best = candidates.find((url) => Boolean(url)) || "";
  return best ? normalizeCoverUrl(best) : "";
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
  const trimmed = text.trim();
  if (trimmed.length <= MAX_BODY_CHARS) return trimmed;
  const slice = trimmed.slice(0, MAX_BODY_CHARS);
  const lastBreak = slice.lastIndexOf("\n\n");
  return (lastBreak > MAX_BODY_CHARS * 0.6 ? slice.slice(0, lastBreak) : slice).trim();
}

function stripInlineHtml(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\u200c|\u200d|\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
  ).trim();
}

function htmlFragmentToParagraphs(fragment: string): string {
  let html = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const paragraphs: string[] = [];
  for (const match of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripInlineHtml(match[1]);
    if (text.length >= 20 && !/^Reply To:/i.test(text)) {
      paragraphs.push(text);
    }
  }
  if (paragraphs.length >= 1) {
    return paragraphs.join("\n\n");
  }
  return stripInlineHtml(html);
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
    const wrap =
      html.match(
        /<div[^>]+class=["'][^"']*\bsingle-body-wrap\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class=["'][^"']*social-media/i,
      )?.[1] ||
      html.match(
        /<div[^>]+class=["'][^"']*\bsingle-body-wrap\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )?.[1];
    if (wrap) {
      const text = htmlFragmentToParagraphs(wrap);
      if (text.length >= MIN_BODY_CHARS) return capBody(text);
    }
  }

  if (host.includes("adaderana.lk")) {
    for (const match of html.matchAll(
      /<div[^>]+class=["'][^"']*\bprose\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    )) {
      const text = htmlFragmentToParagraphs(match[1]);
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
  coverImage: string;
  body: string;
};

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
      const coverImage = extractImageFromPageHtml(html, pageUrl);
      const body = extractArticleBodyFromHtml(html, pageUrl);
      if (coverImage || body) {
        return { coverImage, body };
      }
    } catch {
      /* retry once */
    }
  }
  return null;
}

function extractImageFromPageHtml(html: string, pageUrl: string): string {
  const metaPatterns = [
    /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
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
      return normalizeCoverUrl(absolutizeUrl(decodeHtmlEntities(match[1]), pageUrl));
    }
  }

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (!src || /^data:/i.test(src)) continue;
    const lower = src.toLowerCase();
    if (/logo|icon|avatar|pixel|spacer|1x1|tracking|badge|sprite/i.test(lower)) {
      continue;
    }
    const abs = normalizeCoverUrl(absolutizeUrl(decodeHtmlEntities(src), pageUrl));
    if (isImageUrl(abs)) return abs;
  }

  return "";
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
    const description = stripHtml(xmlTagInner(chunk, "description"));
    const content = stripHtml(xmlTagInner(chunk, "content:encoded"));
    if (!title) continue;
    const body = (content || description || title).slice(0, 4000);
    items.push({
      title,
      sourceUrl: link,
      excerpt: (description || title).slice(0, 400),
      body,
      coverImage: firstImageFromXml(chunk, link, feedBase),
    });
  }
  return items;
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
    const needsCover = !item.coverImage;
    const needsBody = isBodyTooShort(item.body, item.title);
    if (!needsCover && !needsBody) return item;

    const pageData = await fetchArticlePageData(item.sourceUrl);
    if (!pageData) return item;

    return {
      ...item,
      coverImage: item.coverImage || pageData.coverImage,
      body:
        needsBody && pageData.body && !isBodyTooShort(pageData.body, item.title)
          ? pageData.body
          : item.body,
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
  error?: string;
};

export async function runNewsIngest(options?: {
  maxPerSource?: number;
  sources?: NewsSource[];
}): Promise<{ ok: boolean; results: IngestResult[]; createdIds: string[] }> {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.",
    );
  }

  const maxPerSource = options?.maxPerSource ?? 8;
  const sources = (options?.sources ?? DEFAULT_NEWS_SOURCES).filter(
    (s) => s.active !== false,
  );
  const results: IngestResult[] = [];
  const createdIds: string[] = [];

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

  for (const src of sources) {
    const row: IngestResult = {
      source: src.name,
      fetched: 0,
      created: 0,
      skipped: 0,
      backfilled: 0,
    };
    try {
      const items = await fetchRss(src.rss, maxPerSource);
      row.fetched = items.length;

      for (const item of items) {
        const title = item.title.trim();
        if (!hasSinhalaNewsText(title, item.excerpt)) {
          row.skipped += 1;
          continue;
        }

        const hash = sourceHash(item.sourceUrl, title);
        const dupHash = await db
          .collection("articles")
          .where("sourceHash", "==", hash)
          .limit(1)
          .get();
        if (!dupHash.empty) {
          const existing = dupHash.docs[0];
          const existingData = existing.data();
          const existingCover = String(existingData.coverImage || "").trim();
          const existingBody = String(existingData.body || "").trim();
          const needsCover = !existingCover;
          const needsBody =
            existingBody.length < ADMIN_BODY_MIN_CHARS &&
            isBodyTooShort(existingBody, title);
          const updates: Record<string, string | number> = {};

          let pageData: ArticlePageData | null = null;
          if (item.sourceUrl && (needsCover || needsBody)) {
            pageData = await fetchArticlePageData(item.sourceUrl);
          }

          if (needsCover) {
            const cover = item.coverImage.trim() || pageData?.coverImage || "";
            if (cover) updates.coverImage = cover;
          }

          if (needsBody) {
            let fullerBody = item.body;
            if (isBodyTooShort(fullerBody, title)) {
              fullerBody = pageData?.body || fullerBody;
            }
            if (
              fullerBody &&
              fullerBody.length > existingBody.length &&
              !isBodyTooShort(fullerBody, title)
            ) {
              updates.body = capBody(fullerBody);
              updates.readingTimeMin = readingTime(String(updates.body));
            }
          }

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date().toISOString();
            await existing.ref.update(updates);
            row.backfilled += 1;
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

        const body = capBody(item.body || item.excerpt || title);

        const now = new Date().toISOString();
        const ref = await db.collection("articles").add({
          type: "news",
          title,
          slug: slugify(title),
          excerpt: item.excerpt || title,
          body,
          category: src.category,
          coverImage: item.coverImage || "",
          author: `FM Heart · ${src.name}`,
          status: "draft",
          tags: [src.name, src.category],
          readingTimeMin: readingTime(body),
          views: 0,
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
          seoTitle: title,
          seoDescription: item.excerpt || title,
          source: src.name,
          sourceUrl: item.sourceUrl,
          sourceHash: hash,
          ingestedBy: "newsbot",
        });

        createdIds.push(ref.id);
        recentTitles.unshift(needle);
        row.created += 1;
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err);
    }
    results.push(row);
  }

  return { ok: true, results, createdIds };
}
