const url = "https://fmheart-tau.vercel.app/";
const t = await fetch(url, {
  headers: { "User-Agent": "FMHeartNewsBot/1.0", "Cache-Control": "no-cache" },
}).then((r) => r.text());

// Escape-aware image URLs from RSC/flight payload
const imgs = [
  ...t.matchAll(
    /https:\\\/\\\/www\.nethnews\.lk\\\/wp-content\\\/uploads\\\/[^"\\]+(?:\\\/[^"\\]+)*/g,
  ),
].map((m) => m[0].replace(/\\+/g, ""));

const imgs2 = [
  ...t.matchAll(/https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"\\\s]+/g),
].map((m) => m[0]);

const all = [...imgs, ...imgs2].filter((u) => /\.(jpe?g|png|webp)/i.test(u));
const counts = {};
for (const u of all) counts[u] = (counts[u] || 0) + 1;

const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10);
const resolved = [];
for (const item of items) {
  const block = item[1];
  const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim()
    .slice(0, 50);
  const html = await fetch(link, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0",
      Referer: "https://www.nethnews.lk/",
    },
  })
    .then((r) => r.text())
    .catch(() => "");
  const og =
    html.match(
      /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(
      /content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
    )?.[1] ||
    "";
  resolved.push({ title, og: og.split("/").pop() });
}

console.log(
  JSON.stringify(
    {
      homeTop: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([src, count]) => ({ src: src.split("/").pop(), count })),
      uniqueHome: Object.keys(counts).length,
      feedOg: resolved,
    },
    null,
    2,
  ),
);
