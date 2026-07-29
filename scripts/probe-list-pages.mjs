const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

async function fetchHtml(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  return { status: r.status, html: await r.text(), url: r.url };
}

function extractLinks(html, base) {
  const links = [];
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let href = m[1];
    if (href.startsWith("/")) {
      try {
        href = new URL(href, base).href;
      } catch {
        continue;
      }
    }
    links.push(href);
  }
  return [...new Set(links)];
}

for (const page of [
  "https://sinhala.newsfirst.lk/",
  "https://www.lankaenews.com/",
]) {
  const { status, html, url } = await fetchHtml(page);
  console.log("\n===", url, status, "len", html.length);
  const articleLike = extractLinks(html, url).filter((u) => {
    try {
      const p = new URL(u);
      if (page.includes("newsfirst")) {
        return p.hostname.includes("newsfirst.lk") && /\/\d+\//.test(p.pathname);
      }
      if (page.includes("lankaenews")) {
        return p.hostname.includes("lankaenews.com") && p.pathname.length > 5 && !/\.(css|js|png|jpg)/i.test(p.pathname);
      }
    } catch {
      return false;
    }
    return false;
  });
  console.log("article links sample:", articleLike.slice(0, 8));
  const jsonLd = html.includes("application/ld+json");
  const wpJson = html.includes("wp-json");
  console.log("jsonLd", jsonLd, "wp-json", wpJson);
  const apiMatch = html.match(/https?:\/\/[^"']+(?:api|json|feed)[^"']*/gi);
  console.log("api-like", [...new Set(apiMatch || [])].slice(0, 10));
}
