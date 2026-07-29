const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const urls = [
  "https://www.lankahotnews.net/feed/",
  "https://www.lankahotnews.net/rss",
  "https://www.lankahotnews.net/rss.xml",
  "https://www.lankahotnews.net/?feed=rss2",
  "https://www.lankahotnews.net/feed",
];

for (const u of urls) {
  try {
    const r = await fetch(u, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, */*" },
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    const items = (t.match(/<item/gi) || []).length;
    console.log(r.status, items, u, t.slice(0, 100).replace(/\s+/g, " "));
  } catch (e) {
    console.log("ERR", u, e.message);
  }
}

const home = await fetch("https://www.lankahotnews.net/", {
  headers: { "User-Agent": UA },
  signal: AbortSignal.timeout(20000),
});
const html = await home.text();
const feeds = [...html.matchAll(/href=["']([^"']*(?:rss|feed|atom)[^"']*)["']/gi)].map((m) => m[1]);
console.log("\nhomepage feed links:", [...new Set(feeds)].slice(0, 15));
const articles = [...html.matchAll(/href=["'](https?:\/\/www\.lankahotnews\.net\/[^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((u) => !/feed|rss|wp-content|category|tag|page|author/i.test(u))
  .slice(0, 8);
console.log("article links", articles);
