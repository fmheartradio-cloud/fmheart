import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const url =
  "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "pre-fix-dup",
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

const r = await fetch(url, {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const html = await r.text();
const idx = html.toLowerCase().indexOf("kolaba-mahesthrath");
const slice = html.slice(Math.max(0, idx - 500), idx + 300);
const classes = [
  ...html.matchAll(
    /class=["']([^"']*(?:related|outbrain|reco|popular|more-news|you-may|td-ss|sidebar)[^"']*)["']/gi,
  ),
].map((m) => m[1]).slice(0, 25);
const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
const articleHasKolaba = /kolaba-mahesthrath/i.test(article);
const relatedCut = article.split(
  /<(?:div|section|aside)[^>]+class=["'][^"']*\b(?:related|outbrain|reco|popular|more-news|you-may|td-related|jp-relatedposts)\b/i,
)[0];
const relatedCutHasKolaba = /kolaba-mahesthrath/i.test(relatedCut);
const yt = (html.match(/youtube\.com\/embed|youtube-nocookie\.com\/embed/gi) || [])
  .length;

log("F", "probe:related-pollution", "where kolaba image sits in Japan article HTML", {
  idx,
  articleHasKolaba,
  relatedCutHasKolaba,
  ytEmbedCount: yt,
  classSample: classes,
  slicePreview: slice.replace(/\s+/g, " ").slice(0, 400),
});

console.log(
  JSON.stringify({ idx, articleHasKolaba, relatedCutHasKolaba, yt, classes: classes.slice(0, 8) }, null, 2),
);
