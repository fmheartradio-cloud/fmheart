const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

async function fetchHtml(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  return { status: r.status, html: await r.text(), url: r.url };
}

const pages = [
  "https://www.lankaenews.com/",
  "https://www.lankaenews.com/home/change_language/si",
  "https://www.lankaenews.com/si",
  "https://si.lankaenews.com/",
  "https://www.lankaenews.com/news",
  "https://www.lankaenews.com/latest",
];

for (const page of pages) {
  try {
    const { status, html, url } = await fetchHtml(page);
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
    const articles = links.filter((u) =>
      /lankaenews\.com\/(?!wp-content|home\/change|features|about|advert|contact|privacy)/i.test(u) &&
      !/\.(css|js|ico|gif|jpg|png|webp)(\?|$)/i.test(u) &&
      u.length > 35,
    );
    console.log("\n===", page, "->", url, status);
    console.log([...new Set(articles)].slice(0, 12));
    const titles = [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((t) => /[\u0D80-\u0DFF]/.test(t))
      .slice(0, 5);
    console.log("sinhala headings:", titles);
  } catch (e) {
    console.log("ERR", page, e.message);
  }
}
