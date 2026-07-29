const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const path = "/2026/07/26/%e0%b6%bd%e0%b6%b6%e0%b6%b1-%e0%b6%b8%e0%b7%8f%e0%b7%83%e0%b6%ba-%e0%b6%b8%e0%b7%93%e0%b6%a7-%e0%b7%80%e0%b6%a9%e0%b7%8f-%e0%b6%8b%e0%b6%ab%e0%b7%94";
const url = `https://sinhala.newsfirst.lk${path}`;
const r = await fetch(url, { headers: { "User-Agent": UA } });
const html = await r.text();
console.log("status", r.status);
const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
console.log("title", title);
console.log("og", og?.slice(0, 120));
const classes = [...html.matchAll(/class=["']([^"']+)["']/gi)].map((m) => m[1]).filter((c) => /content|article|story|news|body|detail|text/i.test(c));
console.log("classes", [...new Set(classes)].slice(0, 20));
const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
  .filter((t) => /[\u0D80-\u0DFF]/.test(t) && t.length > 40)
  .slice(0, 3);
console.log("paras", paras);
