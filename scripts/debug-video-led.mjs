import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";
const RELATED_SECTION_RE =
  /<(?:div|section|aside)[^>]+class=["'][^"']*\b(?:related|outbrain|reco|popular-posts|popular-news|more-news|you-may|td-related|jp-relatedposts|sidebar)\b/i;

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-video-led",
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

function articleBody(html) {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  return article.split(RELATED_SECTION_RE)[0] || "";
}

function isVideoLed(html) {
  const body = articleBody(html);
  const re =
    /<iframe[^>]+src=["'][^"']*(?:youtube\.com|youtube-nocookie\.com|youtu\.be)[^"']*["']/gi;
  const matches = [...body.matchAll(re)];
  if (!matches.length) return { videoLed: false, firstYt: -1, ytCount: 0 };
  const firstYt = matches[0].index ?? 0;
  return {
    videoLed: firstYt < 1200 || matches.length >= 2,
    firstYt,
    ytCount: matches.length,
    early: firstYt < 1200,
  };
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

const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const homeHtml = await home.text();
const links = [
  ...new Set(
    [...homeHtml.matchAll(/href=["'](https:\/\/www\.nethnews\.lk\/[^"'#]+)["']/gi)].map(
      (m) => m[1],
    ),
  ),
]
  .filter((u) => /breaking-news|foreign-news|local-news|sports|article|\d{4}\/\d{2}/i.test(u))
  .slice(0, 8);

links.unshift(
  "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/",
);

for (const url of links) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
    signal: AbortSignal.timeout(20000),
  });
  const html = await r.text();
  const info = isVideoLed(html);
  const og = extractOg(html);
  const chosen = info.videoLed ? "" : og;
  log("H2", "probe:video-led", "video-led heuristic", {
    url: url.slice(0, 140),
    ...info,
    og: (og || "").slice(0, 100),
    wouldKeepOg: Boolean(chosen),
    title: (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 80),
  });
  console.log(
    info.videoLed ? "VIDEO" : "PHOTO",
    "firstYt",
    info.firstYt,
    "yt",
    info.ytCount,
    (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 50),
  );
}
