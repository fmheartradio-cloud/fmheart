import sharp from "sharp";
import { appendFileSync, writeFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-poster-v2",
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
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ctype = r.headers.get("content-type") || "";
  if (!/image\//i.test(ctype) && !/\.(jpe?g|png|webp)(\?|$)/i.test(url)) {
    throw new Error(`not image: ${ctype}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const { data, info } = await sharp(buf)
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
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
        if (lum < 50) dark++;
        if (lum > 210) bright++;
        if (r0 > 140 && r0 > g0 * 1.35 && r0 > b0 * 1.35) red++;
        n++;
      }
    }
    return { darkRatio: dark / n, brightRatio: bright / n, redRatio: red / n };
  }

  const tr = regionStats(Math.floor(w * 0.68), 0, Math.floor(w * 0.3), Math.floor(h * 0.2));
  const lower = regionStats(Math.floor(w * 0.05), Math.floor(h * 0.55), Math.floor(w * 0.9), Math.floor(h * 0.4));
  const brTiny = regionStats(Math.floor(w * 0.82), Math.floor(h * 0.86), Math.floor(w * 0.16), Math.floor(h * 0.12));

  const netNewsBadge = tr.redRatio >= 0.1;
  const lowerGraphicText = lower.redRatio >= 0.12 && lower.brightRatio >= 0.08;
  const durationPill = brTiny.darkRatio >= 0.25 && brTiny.brightRatio >= 0.03;
  const likelyVideoPoster =
    (netNewsBadge && lowerGraphicText) || (netNewsBadge && durationPill) || (lowerGraphicText && durationPill);

  log("I", "probe:poster-v2", "designed poster heuristic", {
    label,
    url: url.slice(0, 130),
    tr,
    lower,
    brTiny,
    netNewsBadge,
    lowerGraphicText,
    durationPill,
    likelyVideoPoster,
  });
  console.log({
    label,
    likelyVideoPoster,
    netNewsBadge,
    lowerGraphicText,
    durationPill,
  });
  return likelyVideoPoster;
}

writeFileSync(LOG, "");

await analyze(
  "https://www.nethnews.lk/wp-content/uploads/2026/07/28-3.jpg",
  "japan-poster",
);

const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const html = await home.text();
const ogs = [
  ...new Set(
    [
      ...html.matchAll(
        /https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"'\\\s>]+\.(?:jpe?g|png|webp)/gi,
      ),
    ].map((m) => m[0]),
  ),
]
  .filter((u) => !/28-3\.jpg/i.test(u))
  .slice(0, 5);

for (const u of ogs) {
  try {
    await analyze(u, "home-img");
  } catch (e) {
    console.log("skip", u.slice(0, 60), e.message);
  }
}
