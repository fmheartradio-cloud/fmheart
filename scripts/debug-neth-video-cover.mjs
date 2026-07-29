/**
 * Runtime probe: Neth designed video poster covers (WP upload, not ytimg).
 * Writes NDJSON to debug-61a747.log and posts to the debug ingest server.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LOG_PATH = resolve("debug-61a747.log");
const INGEST =
  "http://127.0.0.1:7656/ingest/cfe460b0-074c-4b3f-86cd-4c0f400599c3";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

const CANDIDATE_URLS = [
  "https://www.nethnews.lk/article/196479",
  "https://www.nethnews.lk/?p=196479",
];

const VIDEO_THUMB_RE =
  /(?:ytimg|youtube|youtubei|vimeocdn|dailymotion|jwplayer|maxresdefault|hqdefault|mqdefault|sddefault|video[-_/]?thumb|thumbnail[-_/]?video|poster[-_/]?frame|play[-_/]?overlay|embed[-_/]?thumb|\/embed\/)/i;

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-pre-fix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`);
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "61a747",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function isLikelyVideoThumbnailUrl(url) {
  return Boolean(url && VIDEO_THUMB_RE.test(url));
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
  return (html.match(/youtube\.com\/embed|youtube-nocookie\.com\/embed|youtu\.be\//gi) || [])
    .length;
}

function extractArticleImgs(html) {
  const block =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(
      /<div[^>]+class=["'][^"']*\b(?:entry-content|article-content|post-content)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    )?.[1] ||
    "";
  if (!block) return [];
  const out = [];
  for (const match of block.matchAll(/<img[^>]+>/gi)) {
    const tag = match[0];
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    if (!src || /^data:/i.test(src)) continue;
    const local = block.slice(
      Math.max(0, (match.index || 0) - 220),
      (match.index || 0) + tag.length + 220,
    );
    out.push({
      src: src.slice(0, 180),
      nearVideo: /youtube|ytimg|iframe|video|jwplayer|embed/i.test(local),
      isVideoUrl: isLikelyVideoThumbnailUrl(src),
    });
  }
  return out.slice(0, 12);
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      Referer: "https://www.nethnews.lk/",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  return { ok: res.ok, status: res.status, finalUrl: res.url, html: await res.text() };
}

async function probeSiteCover() {
  // Public site home — find the Japan article cover URL currently served.
  try {
    const res = await fetch("https://fmheart-tau.vercel.app/", {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(20000),
    });
    const html = await res.text();
    const hit = html.includes("ජපානයේ ඉදිකිරීමට") || html.includes("28-3.jpg");
    const coverMatch = html.match(
      /https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"'\s]*28-3\.jpg/i,
    );
    const anyNethUpload = [
      ...html.matchAll(
        /https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"'\s]+\.(?:jpe?g|png|webp)/gi,
      ),
    ]
      .map((m) => m[0])
      .slice(0, 8);
    log("E", "probe:fmheart-home", "production HTML cover signals", {
      status: res.status,
      japanTitlePresent: hit,
      cover28_3: coverMatch?.[0] || null,
      nethUploadsSample: anyNethUpload,
    });
  } catch (err) {
    log("E", "probe:fmheart-home", "home fetch failed", {
      error: String(err?.message || err),
    });
  }
}

async function main() {
  writeFileSync(LOG_PATH, "");

  // Hypothesis A: WP upload URL fails video-thumb regex
  const sampleOg = "https://www.nethnews.lk/wp-content/uploads/2026/07/28-3.jpg";
  log("A", "probe:url-filter", "isLikelyVideoThumbnailUrl on designed poster", {
    url: sampleOg,
    matched: isLikelyVideoThumbnailUrl(sampleOg),
    ytimgMatched: isLikelyVideoThumbnailUrl(
      "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
    ),
  });

  await probeSiteCover();

  // Find article URL via search/sitemap-ish: try recent list pages
  const listPages = [
    "https://www.nethnews.lk/",
    "https://www.nethnews.lk/category/breaking-news/",
    "https://www.nethnews.lk/category/foreign-news/",
  ];

  let articleUrl = "";
  for (const listUrl of listPages) {
    try {
      const { ok, status, html, finalUrl } = await fetchPage(listUrl);
      log("B", "probe:list", "fetched list page", {
        listUrl,
        finalUrl,
        ok,
        status,
        hasJapan: /ජපාන|මුස්ලිම් පල්ලි|28-3\.jpg/i.test(html),
      });
      if (!ok) continue;
      const link =
        html.match(
          /href=["'](https?:\/\/www\.nethnews\.lk\/[^"']+)["'][^>]*>[\s\S]{0,80}ජපාන/i,
        )?.[1] ||
        html.match(
          /href=["'](https?:\/\/www\.nethnews\.lk\/[^"']*28-3[^"']*)["']/i,
        )?.[1] ||
        html.match(
          /href=["'](https?:\/\/www\.nethnews\.lk\/[^"']+)["'][^>]*>[\s\S]{0,120}මුස්ලිම් පල්ලි/i,
        )?.[1];
      if (link) {
        articleUrl = link;
        break;
      }
      // Also catch permalink near og image usage in cards
      const near = html.match(
        /wp-content\/uploads\/2026\/07\/28-3\.jpg[\s\S]{0,400}?href=["'](https?:\/\/www\.nethnews\.lk\/[^"']+)["']/i,
      );
      if (near?.[1]) {
        articleUrl = near[1];
        break;
      }
      const hrefNearImg = html.match(
        /href=["'](https?:\/\/www\.nethnews\.lk\/[^"']+)["'][\s\S]{0,600}?28-3\.jpg/i,
      );
      if (hrefNearImg?.[1]) {
        articleUrl = hrefNearImg[1];
        break;
      }
    } catch (err) {
      log("B", "probe:list", "list fetch error", {
        listUrl,
        error: String(err?.message || err),
      });
    }
  }

  if (!articleUrl) {
    // Fallback: user screenshot source pattern
    articleUrl = CANDIDATE_URLS[0];
    log("B", "probe:list", "no article link found; using fallback candidates", {
      fallbacks: CANDIDATE_URLS,
    });
  }

  const urls = articleUrl
    ? [articleUrl, ...CANDIDATE_URLS.filter((u) => u !== articleUrl)]
    : CANDIDATE_URLS;

  for (const url of urls) {
    try {
      const { ok, status, html, finalUrl } = await fetchPage(url);
      const og = extractOg(html);
      const yt = countYt(html);
      const imgs = extractArticleImgs(html);
      const contentCandidates = imgs.filter((i) => !i.nearVideo && !i.isVideoUrl);
      log("B", "probe:article", "article page cover pipeline", {
        requested: url,
        finalUrl,
        ok,
        status,
        og: og.slice(0, 180),
        ogMatchedVideoUrlFilter: isLikelyVideoThumbnailUrl(og),
        ytEmbedCount: yt,
        articleImgCount: imgs.length,
        contentCandidateCount: contentCandidates.length,
        contentCandidates: contentCandidates.slice(0, 5),
        imgsSample: imgs.slice(0, 5),
        titleHint: (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 120),
      });
      // Hypothesis C: cleanup would skip because URL filter false
      log("C", "probe:cleanup-gate", "would cleanupVideoThumbnailCovers select this cover?", {
        cover: og.slice(0, 180),
        wouldSelect: isLikelyVideoThumbnailUrl(og),
      });
      // Hypothesis D: retune would keep same og
      const chosen = contentCandidates[0]?.src || og;
      log("D", "probe:retune", "retune would choose", {
        chosen: (chosen || "").slice(0, 180),
        sameAsOg: chosen === og,
        noBetterPhoto: contentCandidates.length === 0 && yt > 0,
      });
      if (ok && og) break;
    } catch (err) {
      log("B", "probe:article", "article fetch error", {
        url,
        error: String(err?.message || err),
      });
    }
  }

  console.log("Wrote", LOG_PATH);
}

main().catch((err) => {
  log("X", "probe:fatal", "probe crashed", { error: String(err?.message || err) });
  console.error(err);
  process.exit(1);
});
