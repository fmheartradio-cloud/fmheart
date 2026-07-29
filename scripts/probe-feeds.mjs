const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const pages = [
  "https://www.nethnews.lk/",
  "https://sinhala.newsfirst.lk/",
  "https://sinhala.adaderana.lk/",
  "https://www.lankaenews.com/",
];

const extraUrls = [
  "https://sinhala.newsfirst.lk/rss",
  "https://sinhala.newsfirst.lk/feed/rss2",
  "https://sinhala.newsfirst.lk/index.php?format=feed&type=rss",
  "https://www.adaderana.lk/rss.php",
  "https://www.adaderana.lk/sinhala/rss.php",
  "https://sinhala.adaderana.lk/sitemap.xml",
  "https://www.lankaenews.com/sitemap.xml",
  "https://www.lankaenews.com/sitemap_index.xml",
  "https://www.lankaenews.com/index.php?format=feed&type=rss",
];

async function probe(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    const items = (t.match(/<item/gi) || []).length;
    const isRss = /<rss|<feed|<urlset/i.test(t);
    return { url, status: r.status, items, isRss, preview: t.slice(0, 120).replace(/\s+/g, " ") };
  } catch (e) {
    return { url, error: e.message };
  }
}

for (const u of extraUrls) {
  console.log(await probe(u));
}

for (const u of pages) {
  const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  const feeds = [...t.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((h) => /rss|feed|atom|sitemap/i.test(h));
  const articleLinks = [...t.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((h) => /newsfirst|adaderana|lankaenews|nethnews/i.test(h))
    .slice(0, 5);
  console.log("\n===", u, "status", r.status);
  console.log("feed-like hrefs:", [...new Set(feeds)].slice(0, 15));
  console.log("sample links:", articleLinks);
}
