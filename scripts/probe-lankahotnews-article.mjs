const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const feed = await fetch("https://www.lankahotnews.net/rss.xml", {
  headers: { "User-Agent": UA },
});
const xml = await feed.text();
const item = xml.split(/<item[\s>]/i)[1];
const link = item.match(/<link>([^<]+)<\/link>/i)?.[1] || item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
const title = item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim();
const cats = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => m[1].trim());
console.log("first item", { link, title, cats });

if (link) {
  const r = await fetch(link, { headers: { "User-Agent": UA } });
  const html = await r.text();
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const classes = [...html.matchAll(/class=["']([^"']*(?:post|entry|content|article|body)[^"']*)["']/gi)]
    .map((m) => m[1])
    .slice(0, 15);
  console.log("og", og?.slice(0, 120));
  console.log("classes", [...new Set(classes)]);
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
    .filter((t) => /[\u0D80-\u0DFF]/.test(t) && t.length > 40)
    .slice(0, 3);
  console.log("paras", paras.map((p) => p.slice(0, 100)));
}
