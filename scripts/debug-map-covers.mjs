import { appendFileSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "map-title-cover",
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

function extractCards(html) {
  // Match cover src then following headline text in NewsGrid/articles
  const cards = [];
  const re =
    /<img[^>]+src="([^"]+)"[^>]*>[\s\S]{0,400}?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  for (const m of html.matchAll(re)) {
    const src = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 8) continue;
    cards.push({
      title: title.slice(0, 80),
      src: src.slice(0, 160),
      isFallback: /fmheart-cover/i.test(src),
      isWatermark: /24-water-mark/i.test(src),
    });
  }
  return cards.filter((c) => !c.isWatermark);
}

for (const url of [
  "https://fmheart-tau.vercel.app/",
  "https://fmheart-tau.vercel.app/news",
  "http://127.0.0.1:3000/",
]) {
  const r = await fetch(url, { headers: { "User-Agent": "FMHeartNewsBot/1.0" } });
  const html = await r.text();
  const cards = extractCards(html);
  const fallbackCards = cards.filter((c) => c.isFallback);
  const realCards = cards.filter((c) => !c.isFallback);
  const target = cards.filter((c) =>
    /බර ඉසිලීමේ|දේවාලයේ|100M|මානශික|නිදහස් ආර/.test(c.title),
  );

  // Probe whether neth image URLs actually load
  const sampleSrcs = [...new Set(realCards.map((c) => c.src))].slice(0, 5);
  const loadChecks = [];
  for (const src of sampleSrcs) {
    try {
      const ir = await fetch(src, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://fmheart-tau.vercel.app/",
        },
        signal: AbortSignal.timeout(12000),
      });
      loadChecks.push({ src: src.slice(0, 100), status: ir.status, ok: ir.ok });
    } catch (e) {
      loadChecks.push({ src: src.slice(0, 100), error: String(e.message || e) });
    }
  }

  log("J", "map:title-cover", "card cover mapping", {
    url,
    totalCards: cards.length,
    fallbackCount: fallbackCards.length,
    realCount: realCards.length,
    target,
    fallbackSample: fallbackCards.slice(0, 8).map((c) => c.title),
    realSample: realCards.slice(0, 6),
    loadChecks,
  });
  console.log(
    JSON.stringify(
      {
        url,
        totalCards: cards.length,
        fallbackCount: fallbackCards.length,
        target,
        fallbackSample: fallbackCards.slice(0, 6).map((c) => c.title),
        loadChecks,
      },
      null,
      2,
    ),
  );
}
