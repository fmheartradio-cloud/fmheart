/** Smoke test: RSS items without inline images should resolve cover via og:image. */
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function decodeHtmlEntities(raw) {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function xmlTagInner(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(
    new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"),
  );
  return match?.[1] || "";
}

function firstImageFromXml(block) {
  const media = block.match(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i);
  if (media?.[1]) return media[1];
  const enc = block.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (enc?.[1] && /\.(jpe?g|png|webp|gif)/i.test(enc[1])) return enc[1];
  const raw = xmlTagInner(block, "description") || xmlTagInner(block, "content:encoded");
  const img = decodeHtmlEntities(raw).match(/<img[^>]+src=["']([^"']+)["']/i);
  return img?.[1] || "";
}

async function ogImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const m =
    html.match(/property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i);
  return m?.[1] || "";
}

const feeds = [
  ["Ada", "https://www.ada.lk/rss/latest_news/1"],
  ["Ada Derana", "https://www.adaderana.lk/rss.php"],
];

for (const [name, rssUrl] of feeds) {
  const xml = await (await fetch(rssUrl, { headers: { "User-Agent": UA } })).text();
  const chunk = xml.split(/<item[\s>]/i)[1];
  const link = xmlTagInner(chunk, "link").trim();
  const title = xmlTagInner(chunk, "title").slice(0, 60);
  const rssImage = firstImageFromXml(chunk);
  const pageImage = rssImage ? rssImage : await ogImage(link);
  console.log(`\n${name}: ${title}`);
  console.log(`  RSS image: ${rssImage || "(none)"}`);
  console.log(`  Resolved cover: ${pageImage || "(none)"}`);
  if (!pageImage) process.exitCode = 1;
}

console.log("\nOK — cover images resolve via og:image when RSS has none.");
