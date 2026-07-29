import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const titles = [
  "බර ඉසිලීමේ",
  "වන්දනා ගිය දේවාලයේ",
  "100M",
  "මානශික",
];

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "verify-user-cards",
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
  "http://127.0.0.1:3000/",
  "http://127.0.0.1:3000/news",
]) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "FMHeartNewsBot/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    const hits = {};
    for (const title of titles) {
      hits[title] = t.includes(title);
    }
    // Find title nearby cover candidates in HTML
    const samples = [];
    for (const title of titles) {
      const idx = t.indexOf(title);
      if (idx < 0) continue;
      const window = t.slice(Math.max(0, idx - 800), idx + 200);
      const imgs = [
        ...window.matchAll(
          /(?:src|image|coverImage)[=:\\"]+(https?:\/\/[^"\\]+|\/logo\/[^"\\]+)/gi,
        ),
      ].map((m) => m[1]);
      samples.push({
        title,
        nearby: [...new Set(imgs)].slice(0, 6),
      });
    }

    const fallbackOnlyCards =
      (t.match(/fmheart-cover\.png/g) || []).length;
    log("J", "verify:user-titles", "user screenshot titles on page", {
      url,
      status: r.status,
      hits,
      samples,
      fallbackOnlyCards,
    });
    console.log(JSON.stringify({ url, hits, samples, fallbackOnlyCards }, null, 2));
  } catch (e) {
    log("J", "verify:user-titles", "fail", { url, error: String(e.message || e) });
    console.log(url, e.message);
  }
}
