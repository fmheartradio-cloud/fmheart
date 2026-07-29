import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "post-fix-h",
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

const RELATED_SECTION_RE =
  /<(?:div|section|aside)[^>]+class=["'][^"']*\b(?:related|outbrain|reco|popular-posts|popular-news|more-news|you-may|td-related|jp-relatedposts|sidebar)\b/i;

function countYt(html) {
  return (html.match(/youtube\.com\/embed|youtube-nocookie\.com\/embed|youtu\.be\//gi) || [])
    .length;
}

function countArticleYt(html) {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  const block = article.split(RELATED_SECTION_RE)[0] || "";
  return countYt(block);
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

writeFileSync(LOG, "");

const urls = [
  {
    label: "japan-video",
    url: "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/",
  },
  {
    label: "home-list-first",
    url: "https://www.nethnews.lk/",
  },
];

// From neth home, grab 2 article links and classify
const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const homeHtml = await home.text();
const links = [
  ...homeHtml.matchAll(/href=["'](https:\/\/www\.nethnews\.lk\/[^"']+)["']/gi),
]
  .map((m) => m[1])
  .filter(
    (u) =>
      !u.includes("/feed") &&
      !u.includes("/category") &&
      !u.endsWith("nethnews.lk/") &&
      /\/\d{4}\/|breaking-news|article/.test(u),
  );
const uniq = [...new Set(links)].slice(0, 4);

for (const url of uniq) {
  urls.push({ label: "sample", url });
}

for (const item of urls) {
  try {
    const r = await fetch(item.url, {
      headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
      signal: AbortSignal.timeout(20000),
    });
    const html = await r.text();
    const ytPage = countYt(html);
    const ytArticle = countArticleYt(html);
    const og = extractOg(html);
    const videoPost = ytArticle > 0;
    const chosen = videoPost ? "" : og;
    log("H", "probe:yt-scope", "page vs article youtube counts", {
      label: item.label,
      url: item.url.slice(0, 160),
      status: r.status,
      ytPage,
      ytArticle,
      videoPost,
      og: (og || "").slice(0, 140),
      chosen: (chosen || "").slice(0, 140),
      wouldClearAll: ytPage > 0 && ytArticle === 0 ? false : undefined,
      falseVideoIfPageScoped: ytPage > 0 && ytArticle === 0,
    });
    console.log(
      item.label,
      "ytPage",
      ytPage,
      "ytArticle",
      ytArticle,
      "videoPost",
      videoPost,
      "chosen?",
      Boolean(chosen),
    );
  } catch (err) {
    log("H", "probe:yt-scope", "fail", {
      url: item.url,
      error: String(err?.message || err),
    });
  }
}
