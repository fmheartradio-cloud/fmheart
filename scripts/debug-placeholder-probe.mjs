const titles = [
  "පළාත් සභා",
  "වැසි තත්ත්වයේ",
  "බිත්තර මිල",
];

const t = await fetch("https://fmheart-tau.vercel.app/", {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Cache-Control": "no-cache",
  },
}).then((r) => r.text());

const cardRe =
  /src="([^"]+)"[\s\S]{0,2000}?font-news-headline[^>]*>([^<]{8,120})</g;
const cards = [];
for (const m of t.matchAll(cardRe)) {
  const title = m[2].replace(/\s+/g, " ").trim();
  if (!titles.some((x) => title.includes(x.slice(0, 6)))) continue;
  cards.push({ src: m[1], title: title.slice(0, 50) });
}

console.log("matched cards", JSON.stringify(cards, null, 2));

const fallbacks = [
  ...t.matchAll(/src="(\/logo\/fmheart-cover\.png)"/g),
].length;
console.log("img fallback count", fallbacks);

// Probe whether election/weather/egg images load
for (const c of cards) {
  if (c.src.startsWith("/")) continue;
  const r = await fetch(c.src, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      Referer: "https://fmheart-tau.vercel.app/",
    },
    redirect: "follow",
  }).catch((e) => ({ ok: false, status: 0, err: String(e) }));
  console.log({
    file: c.src.split("/").pop(),
    status: r.status,
    ok: r.ok,
    type: r.headers?.get?.("content-type"),
  });
}

// Also count all home placeholders vs remote
const allSrc = [
  ...t.matchAll(
    /src="(https:\/\/[^"]+|\/logo\/fmheart-cover\.png)"/g,
  ),
].map((m) => m[1]);
const by = {};
for (const s of allSrc) by[s] = (by[s] || 0) + 1;
console.log(
  "top src",
  Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s, n]) => ({ s: s.slice(0, 80), n })),
);
