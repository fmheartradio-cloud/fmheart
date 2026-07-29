const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 6);
for (const item of items) {
  const block = item[1];
  const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  const enc = block.match(
    /<media:content[^>]+url=["']([^"']+)["']/i,
  )?.[1];
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
    ) ||
    html.match(
      /content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
    );
  const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim()
    .slice(0, 60);
  console.log(
    JSON.stringify({
      title,
      link: link.slice(0, 90),
      enc: enc || null,
      og: og?.[1] || null,
    }),
  );
}
