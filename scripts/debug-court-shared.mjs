const titles = [
  "රිමාන්ඩ් කළ",
  "විනිසුරුවරුන්ගේ විශ්‍රාමයාමේ",
  "රඛිත රාජපක්ෂ",
];

const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
const hits = [];

for (const item of items) {
  const block = item[1];
  const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  if (!titles.some((t) => title.includes(t.slice(0, 8)))) continue;
  const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  const html = await fetch(link, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0",
      Referer: "https://www.nethnews.lk/",
    },
  }).then((r) => r.text());
  const og =
    html.match(
      /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    )?.[1] || "";
  const art = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || "";
  const imgs = [
    ...new Set(
      [...art.matchAll(/wp-content\/uploads\/[^"'\\s>]+\.(?:jpe?g|png|webp)/gi)].map(
        (m) => m[0].split("/").pop(),
      ),
    ),
  ].slice(0, 8);
  hits.push({
    title: title.slice(0, 55),
    og: og.split("/").pop(),
    artImgs: imgs,
  });
}

console.log(JSON.stringify(hits, null, 2));
