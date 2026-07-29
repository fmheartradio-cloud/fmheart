import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "rss-title-og",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(LOG, JSON.stringify(payload) + "\n");
  fetch("http://127.0.0.1:7656/ingest/cfe460b0-074c-4b3f-86cd-4c0f400599c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "61a747",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function unwrap(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const feed = await fetch("https://www.nethnews.lk/feed/", {
  headers: { "User-Agent": UA, Accept: "application/rss+xml,text/xml,*/*" },
});
const xml = await feed.text();
log("P", "rss:fetch", "neth rss status", {
  status: feed.status,
  len: xml.length,
  hasItem: /<item/i.test(xml),
});

const items = [];
for (const chunk of xml.split(/<item[\s>]/i).slice(1).slice(0, 30)) {
  const title = unwrap(chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const link =
    chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ||
    chunk.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
    "";
  const enclosure =
    chunk.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ||
    chunk.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ||
    "";
  const img =
    chunk.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
    enclosure ||
    "";
  items.push({
    title: title.slice(0, 90),
    link: link.slice(0, 160),
    img: img.slice(0, 140),
  });
}

const targets = items.filter((i) =>
  /බර ඉසිලීමේ|මිනගිට|100M|පොදුරද|Comanweltha|කාන්තාවක් මරුට|දේවාල/i.test(
    `${i.title} ${i.img}`,
  ),
);

log("P", "rss:items", "rss items matching sports/shared", {
  itemCount: items.length,
  targets,
  sample: items.slice(0, 5),
});

for (const item of targets.slice(0, 5)) {
  if (!item.link) continue;
  const nr = await fetch(item.link, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const nh = await nr.text();
  const og =
    nh.match(
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ||
    nh.match(
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1] ||
    "";
  log("P", "rss:item-og", "rss article og", {
    title: item.title,
    link: item.link,
    rssImg: item.img,
    og: (og || "").slice(0, 140),
    ogFile: (og || "").split("/").pop() || "",
    rssImgFile: (item.img || "").split("/").pop() || "",
    same: Boolean(og) && og === item.img,
  });
  console.log({
    title: item.title.slice(0, 40),
    og: (og || "").split("/").pop(),
    rssImg: (item.img || "").split("/").pop(),
  });
}
