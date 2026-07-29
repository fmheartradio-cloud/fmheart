const t = await fetch("https://fmheart-tau.vercel.app/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0", "Cache-Control": "no-cache" },
}).then((r) => r.text());

// Pull slug + image pairs from flight payload
const slugs = [...t.matchAll(/"slug":"([^"]+)"/g)].map((m) => m[1]);
const images = [
  ...t.matchAll(/"image":"(https:\/\/[^"]+|\\?\/logo\/[^"]+)"/g),
].map((m) => m[1].replace(/\\/g, ""));
const titles = [...t.matchAll(/"title":"([^"]{10,80})"/g)].map((m) =>
  m[1].replace(/\\u[\dA-Fa-f]{4}/g, (x) =>
    String.fromCharCode(parseInt(x.slice(2), 16)),
  ),
);

const slugCounts = {};
for (const s of slugs) slugCounts[s] = (slugCounts[s] || 0) + 1;
const dupSlugs = Object.entries(slugCounts)
  .filter(([, n]) => n > 1)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);

const imgCounts = {};
for (const i of images) imgCounts[i] = (imgCounts[i] || 0) + 1;

console.log(
  JSON.stringify(
    {
      slugCount: slugs.length,
      uniqueSlugs: Object.keys(slugCounts).length,
      imageCount: images.length,
      uniqueImages: Object.keys(imgCounts).length,
      fallback: imgCounts["/logo/fmheart-cover.png"] || 0,
      dupSlugs: dupSlugs.map(([slug, count]) => ({
        slug: slug.slice(0, 60),
        count,
      })),
      topImages: Object.entries(imgCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([src, count]) => ({ src: src.split("/").pop(), count })),
      titleSample: titles.slice(0, 15),
    },
    null,
    2,
  ),
);
