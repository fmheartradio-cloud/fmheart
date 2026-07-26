/** Mirror src/lib/newsbot/ingest.ts cover resolution for smoke testing. */
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function decodeHtmlEntities(raw) {
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

function unwrapCdata(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
  return match ? match[1] : trimmed;
}

function isImageMime(type) {
  return /^image\//i.test(type.trim());
}

function isImageUrl(url) {
  const lower = url.toLowerCase();
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$|#)/i.test(lower)) return true;
  if (/[?&](format|fm|f)=?(jpg|jpeg|png|webp|gif)/i.test(lower)) return true;
  return false;
}

function absolutizeUrl(url, ...bases) {
  const trimmed = url.trim();
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

function stripHtml(raw) {
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

function xmlTagInner(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(
    new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"),
  );
  return match?.[1] || "";
}

function imageFromHtmlFragment(html, itemLink, feedBase) {
  const decoded = decodeHtmlEntities(unwrapCdata(html));
  for (const match of decoded.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (!src || /^data:/i.test(src)) continue;
    const abs = absolutizeUrl(src, itemLink, feedBase);
    if (isImageUrl(abs)) return abs;
  }
  return "";
}

function firstImageFromXml(block, itemLink, feedBase) {
  const candidates = [];
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
  return candidates.find((url) => Boolean(url)) || "";
}

function extractImageFromPageHtml(html, pageUrl) {
  const metaPatterns = [
    /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
  ];
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return absolutizeUrl(decodeHtmlEntities(match[1]), pageUrl);
    }
  }
  return "";
}

async function fetchCoverImageFromPage(sourceUrl) {
  if (!sourceUrl) return "";
  try {
    const res = await fetch(sourceUrl, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return extractImageFromPageHtml(html, sourceUrl);
  } catch (e) {
    return `ERROR:${e.message}`;
  }
}

function parseRssItems(xml, limit) {
  const feedBase = stripHtml(xmlTagInner(xml.split(/<item[\s>]/i)[0], "link"));
  const items = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const chunk of chunks.slice(0, limit)) {
    const title = stripHtml(xmlTagInner(chunk, "title"));
    const link = stripHtml(
      xmlTagInner(chunk, "link") || xmlTagInner(chunk, "guid"),
    );
    items.push({
      title: title.slice(0, 50),
      sourceUrl: link,
      rssCover: firstImageFromXml(chunk, link, feedBase),
    });
  }
  return items;
}

const feeds = [
  ["Ada", "https://www.ada.lk/rss/latest_news/1"],
  ["Ada Derana", "https://www.adaderana.lk/rss.php"],
  ["BBC Sinhala", "https://feeds.bbci.co.uk/sinhala/rss.xml"],
];

for (const [name, rssUrl] of feeds) {
  const xml = await (
    await fetch(rssUrl, { headers: { "User-Agent": UA } })
  ).text();
  const items = parseRssItems(xml, 2);
  console.log(`\n=== ${name} ===`);
  for (const item of items) {
    let cover = item.rssCover;
    let source = "rss";
    if (!cover && item.sourceUrl) {
      cover = await fetchCoverImageFromPage(item.sourceUrl);
      source = "og:image";
    }
    console.log(`  ${item.title}`);
    console.log(`    link: ${item.sourceUrl.slice(0, 80)}`);
    console.log(`    cover (${source}): ${cover || "(none)"}`);
    if (!cover || cover.startsWith("ERROR:")) process.exitCode = 1;
  }
}
