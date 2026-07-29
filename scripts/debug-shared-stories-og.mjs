const queries = [
  "වතුපිටිවලදී",
  "හොරණ රෝහල්",
  "දෙවිනුවර පෙරහැරට තවදුරටත්",
  "කාවාඩි කණ්ඩායම්",
];

const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

// Also search site via recent posts - use feed + a second page if needed
const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
}).then((r) => r.text());

const links = [
  ...new Set(
    [...home.matchAll(/href="(https:\/\/www\.nethnews\.lk\/[^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => /breaking-news|local-news|foreign-news/i.test(u)),
  ),
].slice(0, 40);

for (const q of queries) {
  const hit = links.find((u) => false);
  void hit;
}

const results = [];
for (const link of links.slice(0, 25)) {
  const html = await fetch(link, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0",
      Referer: "https://www.nethnews.lk/",
    },
  })
    .then((r) => r.text())
    .catch(() => "");
  const title = html
    .match(/<title>([^<]+)<\/title>/i)?.[1]
    ?.replace(/\s*[|\-].*$/, "")
    .trim()
    .slice(0, 50);
  const og =
    html.match(
      /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    )?.[1] || "";
  if (
    queries.some((q) => (title || "").includes(q.slice(0, 8))) ||
    /police-1|Dewundara|Horana|වතුපිටි/i.test(title + og)
  ) {
    results.push({
      title,
      og: og.split("/").pop(),
      link: link.slice(0, 90),
    });
  }
}

// Always print feed items mentioning police/perahera
const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
for (const item of items) {
  const block = item[1];
  const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .trim();
  if (!/පොලිස්|පෙරහැර|කාවාඩි|වතුපිටි|හොරණ/i.test(title)) continue;
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
  results.push({
    title: title.slice(0, 50),
    og: og.split("/").pop(),
    link: link.slice(0, 90),
  });
}

console.log(JSON.stringify(results, null, 2));
