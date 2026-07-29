import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const INGEST =
  "http://127.0.0.1:7656/ingest/cfe460b0-074c-4b3f-86cd-4c0f400599c3";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "verify-fallback",
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

const urls = [
  "https://fmheart-tau.vercel.app/",
  "https://fmheart-tau.vercel.app/news",
  "http://127.0.0.1:3000/",
  "http://127.0.0.1:3000/news",
];

for (const url of urls) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "FMHeartNewsBot/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    const fallback = (
      t.match(/\/logo\/fmheart-cover\.png/g) || []
    ).length;
    const water = (t.match(/24-water-mark\.png/g) || []).length;
    const nextImages = [
      ...t.matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
    ].map((m) => m[1]);
    const coverLike = nextImages.filter(
      (s) =>
        /fmheart-cover|wp-content\/uploads|adaderana|blogspot|googleusercontent|lankaenews/i.test(
          s,
        ),
    );
    const counts = {};
    for (const c of coverLike) counts[c] = (counts[c] || 0) + 1;
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([src, count]) => ({ src: src.slice(0, 140), count }));
    log("G", "verify:fallback-dupes", "fallback and repeated cover imgs", {
      url,
      status: r.status,
      fallbackCount: fallback,
      watermarkCount: water,
      coverLikeCount: coverLike.length,
      topRepeated: top,
    });
    console.log(JSON.stringify({ url, fallback, water, top }, null, 2));
  } catch (err) {
    log("G", "verify:fallback-dupes", "fail", {
      url,
      error: String(err?.message || err),
    });
    console.log(url, String(err?.message || err));
  }
}
