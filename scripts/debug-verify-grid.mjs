import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "verify-grid",
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

writeFileSync(LOG, "");

for (const url of [
  "https://fmheart-tau.vercel.app/",
  "https://fmheart-tau.vercel.app/news",
]) {
  const r = await fetch(url, {
    headers: { "User-Agent": "FMHeartNewsBot/1.0" },
  });
  const t = await r.text();
  // Next may embed article JSON in RSC payload
  const covers = [
    ...t.matchAll(/"image":"(https:\/\/[^"]+|\\?\/logo\/[^"]+)"/g),
  ].map((m) => m[1].replace(/\\/g, ""));
  const fromImg = [
    ...t.matchAll(
      /src="(https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"]+|\/logo\/fmheart-cover\.png)"/g,
    ),
  ].map((m) => m[1]);

  const counts = {};
  for (const c of covers.length ? covers : fromImg) {
    counts[c] = (counts[c] || 0) + 1;
  }
  const unique = Object.keys(counts).length;
  const multi = Object.entries(counts)
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([src, count]) => ({ src: src.slice(0, 100), count }));
  const fallback = counts["/logo/fmheart-cover.png"] || 0;

  log("G", "verify:after-restore", "cover distribution after restore", {
    url,
    unique,
    fallback,
    total: covers.length || fromImg.length,
    multi,
    has28_3: t.includes("28-3.jpg"),
    hasKolaba: /kolaba-mahesthrath/i.test(t),
  });
  console.log({ url, unique, fallback, multi, has28_3: t.includes("28-3.jpg") });
}
