import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const RELATED_SECTION_RE =
  /<(?:div|section|aside)[^>]+class=["'][^"']*\b(?:related|outbrain|reco|popular-posts|popular-news|more-news|you-may|td-related|jp-relatedposts|sidebar)\b/i;

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-content-img",
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

function body(html) {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  return article.split(RELATED_SECTION_RE)[0] || "";
}

function contentImgs(html) {
  const block = body(html);
  const out = [];
  for (const m of block.matchAll(/<img[^>]+>/gi)) {
    const src =
      m[0].match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      m[0].match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    if (!src || /outbrain|logo|icon|emoji|avatar|pixel|1x1|svg/i.test(src)) continue;
    out.push(src.slice(0, 140));
  }
  return out;
}

function ytCount(html) {
  return (
    body(html).match(
      /youtube\.com\/embed|youtube-nocookie\.com\/embed|youtu\.be\//gi,
    ) || []
  ).length;
}

function og(html) {
  return (
    html.match(
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1] ||
    ""
  );
}

const urls = [
  "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/",
  "https://www.nethnews.lk/",
];

const home = await fetch(urls[1], {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const homeHtml = await home.text();
const links = [
  urls[0],
  ...[
    ...new Set(
      [...homeHtml.matchAll(/href=["'](https:\/\/www\.nethnews\.lk\/[^"'#]+)["']/gi)].map(
        (m) => m[1],
      ),
    ),
  ]
    .filter((u) => /breaking-news|local-news|foreign-news/i.test(u) && !u.includes("/category"))
    .slice(0, 6),
];

for (const url of links) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
    signal: AbortSignal.timeout(20000),
  });
  const html = await r.text();
  const imgs = contentImgs(html);
  const yt = ytCount(html);
  const ogUrl = og(html);
  // New rule: videoPost only when YT in article AND no real content photos
  const videoPost = yt > 0 && imgs.length === 0;
  const chosen = videoPost ? "" : ogUrl || imgs[0] || "";
  log("H3", "probe:no-photo-video", "video only if yt and no content imgs", {
    url: url.slice(0, 130),
    yt,
    imgCount: imgs.length,
    imgs: imgs.slice(0, 3),
    videoPost,
    chosen: (chosen || "").slice(0, 120),
    title: (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 70),
  });
  console.log({
    videoPost,
    yt,
    imgs: imgs.length,
    keep: Boolean(chosen),
    title: (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 40),
  });
}
