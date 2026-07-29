const t = await fetch("https://fmheart-tau.vercel.app/news", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0", "Cache-Control": "no-cache" },
}).then((r) => r.text());

const cardRe =
  /src="(https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"]+|\/logo\/fmheart-cover\.png)"[\s\S]{0,1800}?font-news-headline[^>]*>([^<]{8,140})</g;
const cards = [];
for (const m of t.matchAll(cardRe)) {
  cards.push({
    img: m[1].includes("fmheart-cover") ? "PLACEHOLDER" : m[1].split("/").pop(),
    title: m[2].replace(/\s+/g, " ").trim().slice(0, 50),
  });
}
const by = {};
for (const c of cards) {
  by[c.img] = by[c.img] || [];
  by[c.img].push(c.title);
}
const shared = Object.entries(by)
  .filter(([, titles]) => titles.length > 1)
  .map(([img, titles]) => ({ img, titles }));
console.log(JSON.stringify({ count: cards.length, unique: Object.keys(by).length, shared }, null, 2));
