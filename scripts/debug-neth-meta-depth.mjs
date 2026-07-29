const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 12);
for (const item of items) {
  const block = item[1];
  const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim()
    .slice(0, 40);
  const html = await fetch(link, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0 (+https://fmheart.lk)",
      Referer: "https://www.nethnews.lk/",
      Accept: "text/html",
    },
  }).then((r) => r.text());

  const metas = [...html.matchAll(/<meta[^>]+>/gi)]
    .map((m) => m[0])
    .filter((t) => /og:image|twitter:image/i.test(t))
    .slice(0, 4);
  const art = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || "";
  const firstArtImg =
    art.match(/wp-content\/uploads\/[^"'\\s>]+\.(?:jpe?g|png)/i)?.[0] || null;

  console.log(
    JSON.stringify({
      title,
      ogMetas: metas.map((m) => {
        const c = m.match(/content=["']([^"']+)["']/i)?.[1];
        return c ? c.split("/").pop() : m.slice(0, 80);
      }),
      firstArtImg: firstArtImg?.split("/").pop() || null,
      hasDewundara: /Dewundara-perahera/i.test(html),
      hasPolice1: /\/2026\/04\/police-1\.jpg/i.test(html),
    }),
  );
}
