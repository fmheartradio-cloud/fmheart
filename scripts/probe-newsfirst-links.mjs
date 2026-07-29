const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const home = await fetch("https://sinhala.newsfirst.lk/", { headers: { "User-Agent": UA } });
const html = await home.text();
console.log("len", html.length);
const patterns = [
  /sinhala\.newsfirst\.lk\/\d{4}\/\d{2}\/\d{2}\/[^\s"'<>]+/gi,
  /href=["']([^"']*newsfirst[^"']*)["']/gi,
  /routerLink=["']([^"']+)["']/gi,
  /"url":\s*"([^"]+newsfirst[^"]+)"/gi,
];
for (const p of patterns) {
  const m = [...html.matchAll(p)].map((x) => x[1] || x[0]).slice(0, 5);
  if (m.length) console.log(p.source.slice(0, 40), m);
}
// Angular state?
const ng = html.includes("ng-version");
console.log("angular", ng);
const scriptChunks = html.match(/<script[^>]*>([\s\S]{200,800})<\/script>/gi)?.slice(0, 3);
console.log("script sample", scriptChunks?.[0]?.slice(0, 300));
