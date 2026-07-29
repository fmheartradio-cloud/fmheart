const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const home = await fetch("https://sinhala.newsfirst.lk/", { headers: { "User-Agent": UA } });
const html = await home.text();
const links = [...html.matchAll(/href=["'](https:\/\/sinhala\.newsfirst\.lk\/\d{4}\/\d{2}\/\d{2}\/[^"']+)["']/gi)].map((m) => m[1]);
console.log("links", links.slice(0, 3));
const nfLink = links[0];
if (nfLink) {
  const pr = await fetch(nfLink, { headers: { "User-Agent": UA } });
  const page = await pr.text();
  console.log("status", pr.status, "url", pr.url);
  const og = page.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const title = page.match(/<title>([^<]+)<\/title>/i)?.[1];
  const classes = [...page.matchAll(/class=["']([^"']*(?:content|article|story|news|body)[^"']*)["']/gi)].map((m) => m[1]);
  console.log("title", title);
  console.log("og", og?.slice(0, 120));
  console.log("classes", [...new Set(classes)].slice(0, 15));
  const paras = [...page.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter((t) => t.length > 40).slice(0, 3);
  console.log("sample paras", paras);
}
