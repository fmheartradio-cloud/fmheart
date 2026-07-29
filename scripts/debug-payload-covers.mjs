import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
writeFileSync(LOG, "");

function log(data) {
  const payload = {
    sessionId: "61a747",
    runId: "json-cover-verify2",
    hypothesisId: "N",
    location: "verify:payload-covers",
    message: "cover urls in page payload",
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

const url = "https://fmheart-tau.vercel.app/";
const r = await fetch(url, { headers: { "User-Agent": "FMHeartNewsBot/1.0" } });
const t = await r.text();

const neth = [
  ...t.matchAll(
    /https:\\\/\\\/www\.nethnews\.lk\\\/wp-content\\\/uploads\\\/[^"\\]+/g,
  ),
].map((m) => m[0].replace(/\\+/g, ""));
const neth2 = [
  ...t.matchAll(/https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"\\s]+/g),
].map((m) => m[0]);
const ada = [
  ...t.matchAll(/https:\\\/\\\/s3\.amazonaws\.com\\\/adaderanasinhala\\\/[^"\\]+/g),
].map((m) => m[0].replace(/\\+/g, ""));
const all = [...neth, ...neth2, ...ada];
const counts = {};
for (const c of all) counts[c] = (counts[c] || 0) + 1;
const top = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([src, count]) => ({ src: src.slice(0, 110), count }));

const data = {
  fallbackMentions: (t.match(/fmheart-cover\.png/g) || []).length,
  water: (t.match(/24-water-mark/g) || []).length,
  uniqueCovers: Object.keys(counts).length,
  top,
  sharedDistinctTitlesLikely: top.filter((x) => x.count >= 3).length,
};
log(data);
console.log(JSON.stringify(data, null, 2));
