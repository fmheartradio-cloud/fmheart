const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const url = "https://www.lankaenews.com/news/5074/si";
const r = await fetch(url, { headers: { "User-Agent": UA } });
const html = await r.text();
const divs = [...html.matchAll(/<div[^>]+id=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]).slice(0, 30);
console.log("div ids", divs);
const articleBlocks = [...html.matchAll(/<(?:div|section|article)[^>]+class=["']([^"']+)["'][^>]*>([\s\S]{0,500})/gi)]
  .filter((m) => /content|news|story|article|body|text/i.test(m[1]))
  .slice(0, 10)
  .map((m) => ({ class: m[1], preview: m[2].replace(/<[^>]+>/g, " ").slice(0, 120) }));
console.log("blocks", articleBlocks);
const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
  .filter((t) => /[\u0D80-\u0DFF]/.test(t) && t.length > 30)
  .slice(0, 4);
console.log("sinhala paras", paras);

// test list scrape: get ids from homepage and map to si
const home = await fetch("https://www.lankaenews.com/", { headers: { "User-Agent": UA } });
const homeHtml = await home.text();
const ids = [...homeHtml.matchAll(/href=["']\/news\/(\d+)\/en["']/gi)].map((m) => m[1]).slice(0, 8);
console.log("ids", ids);
for (const id of ids.slice(0, 2)) {
  const si = await fetch(`https://www.lankaenews.com/news/${id}/si`, { headers: { "User-Agent": UA } });
  const siHtml = await si.text();
  const h1 = siHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
  const hasSi = /[\u0D80-\u0DFF]{10,}/.test(siHtml);
  console.log(id, "si", si.status, "h1", h1?.slice(0, 60), "hasSi", hasSi);
}
