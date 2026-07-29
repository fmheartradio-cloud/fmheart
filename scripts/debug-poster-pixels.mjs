import sharp from "sharp";
import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-poster-pixels",
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

async function analyze(url, label) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const buf = Buffer.from(await r.arrayBuffer());
  const resized = await sharp(buf)
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = resized;
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  function regionStats(left, top, rw, rh) {
    let dark = 0;
    let red = 0;
    let bright = 0;
    let n = 0;
    for (let y = top; y < top + rh; y++) {
      for (let x = left; x < left + rw; x++) {
        const i = (y * w + x) * ch;
        const r0 = data[i];
        const g0 = data[i + 1];
        const b0 = data[i + 2];
        const lum = (r0 + g0 + b0) / 3;
        if (lum < 45) dark++;
        if (lum > 200) bright++;
        if (r0 > 150 && r0 > g0 * 1.4 && r0 > b0 * 1.4) red++;
        n++;
      }
    }
    return {
      darkRatio: dark / n,
      brightRatio: bright / n,
      redRatio: red / n,
    };
  }

  const br = regionStats(Math.floor(w * 0.72), Math.floor(h * 0.78), Math.floor(w * 0.26), Math.floor(h * 0.18));
  const tr = regionStats(Math.floor(w * 0.7), 0, Math.floor(w * 0.28), Math.floor(h * 0.18));
  const midText = regionStats(Math.floor(w * 0.1), Math.floor(h * 0.55), Math.floor(w * 0.8), Math.floor(h * 0.35));

  // Duration badge: dark cluster bottom-right with some bright pixels (digits)
  const durationBadge =
    br.darkRatio >= 0.18 && br.brightRatio >= 0.02 && br.darkRatio > midText.darkRatio * 0.9;
  // NET NEWS style red block top-right
  const netNewsBadge = tr.redRatio >= 0.08;

  log("I", "probe:poster-pixels", "image region stats", {
    label,
    url: url.slice(0, 120),
    w,
    h,
    br,
    tr,
    midText,
    durationBadge,
    netNewsBadge,
    likelyVideoPoster: durationBadge || (netNewsBadge && br.darkRatio >= 0.12),
  });
  console.log({ label, durationBadge, netNewsBadge, br, tr });
}

await analyze(
  "https://www.nethnews.lk/wp-content/uploads/2026/07/28-3.jpg",
  "japan-poster",
);
await analyze(
  "https://www.nethnews.lk/wp-content/uploads/2025/06/339654994_779780989924484_786",
  "sample-other-broken?",
);

// find a normal photo og from a recent article
const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const html = await home.text();
const ogs = [
  ...html.matchAll(
    /https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"'\\\s]+\.(?:jpe?g|png|webp)/gi,
  ),
].map((m) => m[0]);
const uniq = [...new Set(ogs)].filter((u) => !/28-3\.jpg/i.test(u)).slice(0, 3);
for (const u of uniq) {
  try {
    await analyze(u, "home-card");
  } catch (e) {
    console.log("fail", u, e.message);
  }
}
