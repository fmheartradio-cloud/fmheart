import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "post-dedupe-verify",
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

const url = "https://fmheart-tau.vercel.app/";
const r = await fetch(url, { headers: { "User-Agent": "FMHeartNewsBot/1.0" } });
const t = await r.text();

const allImgs = [...t.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
const covers = allImgs.filter(
  (s) =>
    /fmheart-cover|wp-content\/uploads|adaderanasinhala|blogspot|googleusercontent/i.test(
      s,
    ),
);
const counts = {};
for (const c of covers) counts[c] = (counts[c] || 0) + 1;
const top = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([src, count]) => ({ src: src.slice(0, 120), count }));

const fallback = counts["/logo/fmheart-cover.png"] || 0;
const unique = Object.keys(counts).filter((k) => k !== "/logo/fmheart-cover.png")
  .length;

log("N", "verify:final", "home cover distribution after restore", {
  status: r.status,
  fallback,
  uniqueNonFallback: unique,
  watermark: (t.match(/24-water-mark/g) || []).length,
  top,
  hasComanweltha: /Comanweltha/i.test(t),
  hasLift: t.includes("බර ඉසිලීමේ"),
  hasJapan: t.includes("ජපානයේ"),
});

console.log(
  JSON.stringify(
    { fallback, uniqueNonFallback: unique, top, hasComanweltha: /Comanweltha/i.test(t) },
    null,
    2,
  ),
);
