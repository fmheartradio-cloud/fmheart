const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
for (const item of items) {
  const title = (item[1].match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  if (!/පළාත් සභා|වැසි|බිත්තර/i.test(title)) continue;
  const link = (item[1].match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "")
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
  const status = og
    ? (
        await fetch(og, {
          headers: { "User-Agent": "Mozilla/5.0" },
        })
      ).status
    : null;
  console.log({
    title: title.slice(0, 40),
    og: og.split("/").pop(),
    status,
  });
}
