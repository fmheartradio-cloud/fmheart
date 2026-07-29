const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

for (const path of [
  "https://www.lankaenews.com/news/5074/si",
  "https://www.lankaenews.com/news/5074/en",
  "https://www.lankaenews.com/news/5074",
  "https://www.lankaenews.com/home/change_language/si",
]) {
  const r = await fetch(path, {
    headers: { "User-Agent": UA, Cookie: "language=si" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  const h = await r.text();
  const title = h.match(/<title>([^<]+)<\/title>/i)?.[1];
  const og = h.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const sinhala = /[\u0D80-\u0DFF]{5,}/.test(h);
  const bodyClass = h.match(/class=["'][^"']*(?:news-content|article|entry-content|content-body)[^"']*["']/i)?.[0];
  console.log("\n", path, "->", r.url, r.status);
  console.log("title", title?.slice(0, 80));
  console.log("sinhala", sinhala, "og", og?.slice(0, 80));
  console.log("bodyClass", bodyClass);
}

// List page with si language - scrape homepage after setting si
const listR = await fetch("https://www.lankaenews.com/", {
  headers: { "User-Agent": UA },
  signal: AbortSignal.timeout(20000),
});
const listHtml = await listR.text();
const newsLinks = [...listHtml.matchAll(/href=["'](\/news\/\d+\/[a-z]{2})["']/gi)].map((m) => m[1]);
const counts = {};
for (const l of newsLinks) {
  const lang = l.split("/").pop();
  counts[lang] = (counts[lang] || 0) + 1;
}
console.log("\nnews link langs on homepage", counts);
console.log("sample si links", newsLinks.filter((l) => l.endsWith("/si")).slice(0, 5));
