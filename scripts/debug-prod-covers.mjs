import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-site",
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

const urls = [
  "https://fmheart-tau.vercel.app/",
  "https://fmheart-tau.vercel.app/news",
];

for (const url of urls) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(25000),
  });
  const t = await r.text();
  const hasJapan = t.includes("28-3.jpg") || t.includes("ජපානයේ ඉදිකිරීමට");
  const covers = [...t.matchAll(/https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"'\\\s]+/gi)]
    .map((m) => m[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);
  log("E", "probe:prod-page", "production page cover scan", {
    url,
    status: r.status,
    hasJapan,
    has28_3: t.includes("28-3.jpg"),
    covers,
  });
  console.log(url, r.status, "hasJapan", hasJapan, "covers", covers.length);
}
