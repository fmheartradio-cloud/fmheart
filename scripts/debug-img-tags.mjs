const t = await fetch("https://fmheart-tau.vercel.app/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

console.log("quote image", (t.match(/"image":/g) || []).length);
console.log("src= neth", (t.match(/src="https:\/\/www\.nethnews\.lk[^"]+"/g) || []).length);

const idx = t.indexOf("Dewundara");
console.log("--- context ---");
console.log(t.slice(Math.max(0, idx - 250), idx + 120));

// Collect img src from visible cards
const srcs = [
  ...t.matchAll(
    /src="(https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"]+|\/logo\/fmheart-cover\.png)"/g,
  ),
].map((m) => m[1]);
const counts = {};
for (const s of srcs) counts[s] = (counts[s] || 0) + 1;
console.log(
  JSON.stringify(
    {
      imgTags: srcs.length,
      unique: Object.keys(counts).length,
      fallback: counts["/logo/fmheart-cover.png"] || 0,
      top: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([src, count]) => ({ src: src.split("/").pop(), count })),
    },
    null,
    2,
  ),
);
