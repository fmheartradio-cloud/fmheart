const url = "https://fmheart-tau.vercel.app/";
const r = await fetch(url, {
  headers: { "User-Agent": "FMHeartNewsBot/1.0", "Cache-Control": "no-cache" },
});
const t = await r.text();

const cards = [
  ...t.matchAll(
    /"title":"([^"]{8,120})".{0,400}?"image":"(https:\/\/[^"]+|\\?\/logo\/[^"]+)"/gs,
  ),
].map((m) => ({
  title: m[1].slice(0, 50),
  image: m[2].replace(/\\/g, ""),
}));

const byImg = {};
for (const c of cards) {
  byImg[c.image] = (byImg[c.image] || 0) + 1;
}
const fallback = cards.filter((c) => c.image.includes("fmheart-cover")).length;
const unique = new Set(cards.map((c) => c.image)).size;
const incomplete = cards.filter((c) =>
  /uploads\/\d{4}\/\d{2}\/?$/i.test(c.image),
).length;

console.log(
  JSON.stringify(
    {
      cardHits: cards.length,
      unique,
      fallback,
      incomplete,
      top: Object.entries(byImg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([src, count]) => ({ src: src.slice(0, 90), count })),
      sample: cards.slice(0, 12),
    },
    null,
    2,
  ),
);
