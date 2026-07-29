import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const INGEST =
  "http://127.0.0.1:7656/ingest/cfe460b0-074c-4b3f-86cd-4c0f400599c3";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "post-fix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(LOG, JSON.stringify(payload) + "\n");
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "61a747",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

const RELATED_SECTION_RE =
  /<(?:div|section|aside)[^>]+class=["'][^"']*\b(?:related|outbrain|reco|popular-posts|popular-news|more-news|you-may|td-related|jp-relatedposts|sidebar)\b/i;

function stripRelated(block) {
  return block.split(RELATED_SECTION_RE)[0] || block;
}

function extractOg(html) {
  const m =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );
  return m?.[1] || "";
}

function countYt(html) {
  return (html.match(/youtube\.com\/embed|youtube-nocookie\.com\/embed/gi) || [])
    .length;
}

function contentImage(html) {
  const raw = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  const block = stripRelated(raw);
  const imgs = [];
  for (const match of block.matchAll(/<img[^>]+>/gi)) {
    const src =
      match[0].match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      match[0].match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    if (!src || /outbrain|logo|icon|youtube/i.test(src)) continue;
    imgs.push(src);
  }
  return imgs[0] || "";
}

function chooseNeth(html) {
  const yt = countYt(html);
  const og = extractOg(html);
  const content = contentImage(html);
  if (yt > 0) return { chosen: content || "", yt, og, content, videoPost: true };
  return { chosen: og || content || "", yt, og, content, videoPost: false };
}

const urls = [
  "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/",
];

writeFileSync(LOG, "");

for (const url of urls) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const html = await r.text();
  const result = chooseNeth(html);
  log("F", "probe:post-fix-japan", "cover choice after related-strip + video rules", {
    status: r.status,
    ...result,
    choseKolaba: /kolaba/i.test(result.chosen),
    chose28_3: /28-3\.jpg/i.test(result.chosen),
    clearedVideoPoster: result.videoPost && !result.chosen,
  });
  console.log(result);
}
