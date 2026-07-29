const t = await fetch("https://fmheart-tau.vercel.app/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const cardRe =
  /src="(https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"]+|\/logo\/fmheart-cover\.png)"[\s\S]{0,1800}?font-news-headline[^>]*>([^<]{8,140})</g;
const cards = [];
for (const m of t.matchAll(cardRe)) {
  cards.push({
    img: m[1].includes("fmheart-cover")
      ? "PLACEHOLDER"
      : m[1].split("/").pop(),
    title: m[2].replace(/\s+/g, " ").trim().slice(0, 70),
  });
}

console.log("news grid cards", cards.length);
console.log(JSON.stringify(cards, null, 2));

const byImg = {};
for (const c of cards) {
  byImg[c.img] = byImg[c.img] || [];
  byImg[c.img].push(c.title);
}
console.log(
  "\nshared:",
  JSON.stringify(
    Object.entries(byImg)
      .filter(([, titles]) => titles.length > 1)
      .map(([img, titles]) => ({ img, titles })),
    null,
    2,
  ),
);
