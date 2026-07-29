import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "dup-cover-root",
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

function extractOg(html) {
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

writeFileSync(LOG, "");

const home = await fetch("https://fmheart-tau.vercel.app/", {
  headers: { "User-Agent": UA },
});
const html = await home.text();

// Parse cards: img then h3
const cards = [];
for (const m of html.matchAll(
  /<img[^>]+src="(https:\/\/www\.nethnews\.lk\/[^"]+)"[^>]*>[\s\S]{0,500}?<h3[^>]*>([\s\S]*?)<\/h3>/gi,
)) {
  const src = m[1];
  const title = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const hrefMatch = html
    .slice(Math.max(0, m.index - 200), m.index + m[0].length + 50)
    .match(/href="(\/news\/[^"]+)"/);
  cards.push({
    src,
    title: title.slice(0, 90),
    href: hrefMatch?.[1] || "",
  });
}

const byCover = {};
for (const c of cards) {
  byCover[c.src] = byCover[c.src] || [];
  byCover[c.src].push(c);
}

const shared = Object.entries(byCover)
  .filter(([, list]) => list.length > 1)
  .map(([src, list]) => ({
    src: src.slice(0, 120),
    count: list.length,
    titles: [...new Set(list.map((x) => x.title))].slice(0, 6),
  }));

log("N", "dup:home-shared", "shared covers on home grid", {
  cardCount: cards.length,
  uniqueCovers: Object.keys(byCover).length,
  shared,
});

console.log(JSON.stringify({ cardCount: cards.length, shared }, null, 2));

// For top shared cover, open FM Heart article pages and compare to Neth og
const topShared = Object.entries(byCover).sort((a, b) => b[1].length - a[1].length)[0];
if (topShared) {
  const [sharedSrc, list] = topShared;
  const uniqueArticles = [];
  const seen = new Set();
  for (const item of list) {
    if (!item.href || seen.has(item.href)) continue;
    seen.add(item.href);
    uniqueArticles.push(item);
    if (uniqueArticles.length >= 4) break;
  }

  for (const item of uniqueArticles) {
    const ar = await fetch(`https://fmheart-tau.vercel.app${item.href}`, {
      headers: { "User-Agent": UA },
    });
    const at = await ar.text();
    // source link in article body / meta
    const sourceUrl =
      at.match(
        /href="(https:\/\/www\.nethnews\.lk\/[^"#?]+)"[^>]*>[\s\S]{0,40}(?:මුල්|Source|Neth|කියව)/i,
      )?.[1] ||
      at.match(/"(https:\/\/www\.nethnews\.lk\/[^"]+)"/)?.[1] ||
      "";

    let og = "";
    let ytArticle = 0;
    let status = 0;
    if (sourceUrl) {
      const nr = await fetch(sourceUrl, {
        headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      status = nr.status;
      const nh = await nr.text();
      og = extractOg(nh);
      const article = nh.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
      ytArticle = (
        article.match(/youtube\.com\/embed|youtube-nocookie\.com\/embed/gi) || []
      ).length;
    }

    log("N", "dup:article-og", "shared-cover article vs neth og", {
      title: item.title,
      href: item.href,
      stored: sharedSrc.slice(0, 120),
      sourceUrl: (sourceUrl || "").slice(0, 160),
      nethStatus: status,
      og: (og || "").slice(0, 140),
      ogMatchesStored: Boolean(og) && og === sharedSrc,
      ytArticle,
      canFixWithOg: Boolean(og) && og !== sharedSrc,
    });
    console.log({
      title: item.title.slice(0, 40),
      sourceOk: Boolean(sourceUrl),
      nethStatus: status,
      ogFile: og.split("/").pop() || "(none)",
      storedFile: sharedSrc.split("/").pop(),
      canFix: Boolean(og) && og !== sharedSrc,
    });
  }
}
