import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "json-cover-verify",
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
  const r = await fetch(url, { headers: { "User-Agent": "FMHeartNewsBot/1.0" } });
  const t = await r.text();
  const images = [
    ...t.matchAll(/"image":"(https:[^"]+|\\?\/logo\/[^"]+)"/g),
  ].map((m) => m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
  const counts = {};
  for (const img of images) counts[img] = (counts[img] || 0) + 1;
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([src, count]) => ({ src: src.slice(0, 110), count }));
  const fallback = Object.entries(counts)
    .filter(([s]) => /fmheart-cover/i.test(s))
    .reduce((n, [, c]) => n + c, 0);
  const shared = top.filter((x) => x.count > 1 && !/fmheart-cover/i.test(x.src));

  log("N", "verify:json-covers", "RSC/JSON cover field distribution", {
    url,
    imageFieldCount: images.length,
    unique: Object.keys(counts).length,
    fallback,
    top,
    shared,
  });
  console.log(JSON.stringify({ url, images: images.length, unique: Object.keys(counts).length, fallback, shared, top }, null, 2));
}
