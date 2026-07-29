const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const samples = {
  nethnews: "https://www.nethnews.lk/feed/",
  adaderana: "https://sinhala.adaderana.lk/rsshotnews.php",
  bbc: "https://feeds.bbci.co.uk/sinhala/rss.xml",
};

for (const [name, feedUrl] of Object.entries(samples)) {
  const r = await fetch(feedUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  const xml = await r.text();
  const link = xml.match(/<link>([^<]+)<\/link>/i)?.[1] || xml.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
  const itemBlock = xml.split(/<item[\s>]/i)[1];
  const itemLink =
    itemBlock?.match(/<link>([^<]+)<\/link>/i)?.[1] ||
    itemBlock?.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
  const categories = [...(itemBlock?.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [])].map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim(),
  );
  console.log("\n===", name, "first item ===");
  console.log("link", itemLink);
  console.log("categories", categories);
  if (itemLink) {
    const pr = await fetch(itemLink, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const html = await pr.text();
    const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const classes = [...html.matchAll(/class=["']([^"']*(?:content|article|entry|story|prose|body)[^"']*)["']/gi)]
      .map((m) => m[1])
      .slice(0, 15);
    console.log("og:image", og?.slice(0, 100));
    console.log("content classes", [...new Set(classes)].slice(0, 10));
    console.log("p count", (html.match(/<p/gi) || []).length);
  }
}

// Newsfirst first article from homepage
const home = await fetch("https://sinhala.newsfirst.lk/", { headers: { "User-Agent": UA } });
const homeHtml = await home.text();
const nfLink = homeHtml.match(/https:\/\/sinhala\.newsfirst\.lk\/\d{4}\/\d{2}\/\d{2}\/[^"'\s]+/i)?.[0];
console.log("\n=== newsfirst first article ===", nfLink);
if (nfLink) {
  const pr = await fetch(nfLink, { headers: { "User-Agent": UA } });
  const html = await pr.text();
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const classes = [...html.matchAll(/class=["']([^"']*(?:content|article|entry|story|prose|body|news)[^"']*)["']/gi)]
    .map((m) => m[1])
    .slice(0, 20);
  console.log("og:image", og?.slice(0, 120));
  console.log("content classes", [...new Set(classes)].slice(0, 12));
}
