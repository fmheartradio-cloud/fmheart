import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const INGEST =
  "http://127.0.0.1:7656/ingest/cfe460b0-074c-4b3f-86cd-4c0f400599c3";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "verify-2",
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

writeFileSync(LOG, "");

const pages = [
  "https://fmheart-tau.vercel.app/",
  "https://fmheart-tau.vercel.app/news",
  "http://127.0.0.1:3000/",
  "http://127.0.0.1:3000/news",
];

for (const url of pages) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    const covers = [
      ...t.matchAll(
        /(?:src|content)=["'](https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"']+)["']/gi,
      ),
    ].map((m) => m[1]);
    const allCovers = [
      ...covers,
      ...[...t.matchAll(/"coverImage":"(https:[^"]+)"/g)].map((m) =>
        m[1].replace(/\\u0026/g, "&"),
      ),
      ...[
        ...t.matchAll(
          /coverImage\\?":\\?"(https:[^"\\]+)/g,
        ),
      ].map((m) => m[1]),
    ];
    const unique = [...new Set(allCovers.filter(Boolean))];
    const counts = {};
    for (const c of allCovers) counts[c] = (counts[c] || 0) + 1;
    const dupes = Object.entries(counts)
      .filter(([, n]) => n > 1)
      .map(([c, n]) => ({ cover: c.slice(0, 120), count: n }));
    log("E", "verify:page-covers", "cover uniqueness scan", {
      url,
      status: r.status,
      has28_3: t.includes("28-3.jpg"),
      hasKolaba: /kolaba-mahesthrath/i.test(t),
      hasJapanTitle: t.includes("ජපානයේ ඉදිකිරීමට"),
      uniqueCount: unique.length,
      totalCoverRefs: allCovers.length,
      uniqueSample: unique.slice(0, 12).map((u) => u.slice(0, 140)),
      dupes: dupes.slice(0, 10),
    });
    console.log(
      JSON.stringify(
        {
          url,
          status: r.status,
          has28_3: t.includes("28-3.jpg"),
          hasKolaba: /kolaba-mahesthrath/i.test(t),
          uniqueCount: unique.length,
          dupes: dupes.slice(0, 5),
        },
        null,
        2,
      ),
    );
  } catch (err) {
    log("E", "verify:page-covers", "page fetch failed", {
      url,
      error: String(err?.message || err),
    });
    console.log(url, "FAIL", String(err?.message || err));
  }
}
