const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const r = await fetch("https://www.lankaenews.com/", {
  headers: { "User-Agent": UA },
  signal: AbortSignal.timeout(30000),
});
const h = await r.text();

const hrefs = [...h.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log("unique hrefs count", new Set(hrefs).size);
console.log("sample hrefs", [...new Set(hrefs)].filter((u) => !u.startsWith("#") && !u.includes("wp-content")).slice(0, 40));

const onclick = [...h.matchAll(/onclick=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10);
console.log("onclick", onclick);

const newsPaths = [...h.matchAll(/lankaenews\.com\/[a-z0-9_/-]{5,}/gi)].map((m) => m[0]).slice(0, 20);
console.log("paths", [...new Set(newsPaths)]);

// Look for article titles in Sinhala
const sinhala = [...h.matchAll(/[\u0D80-\u0DFF][\u0D80-\u0DFF\s]{10,200}/g)].slice(0, 8).map((m) => m[0].trim());
console.log("sinhala snippets", sinhala);

// Check for RSS in page source comments/meta
const feedLinks = [...h.matchAll(/(?:rss|feed|atom)/gi)].length;
console.log("feed mentions", feedLinks);

// Try common CodeIgniter patterns
for (const path of [
  "https://www.lankaenews.com/home/rss",
  "https://www.lankaenews.com/home/feed",
  "https://www.lankaenews.com/home/rss_feed",
  "https://www.lankaenews.com/rss_feed",
]) {
  try {
    const rr = await fetch(path, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    const tt = await rr.text();
    console.log(path, rr.status, (tt.match(/<item/gi) || []).length, tt.slice(0, 80).replace(/\s+/g, " "));
  } catch (e) {
    console.log(path, "ERR", e.message);
  }
}
