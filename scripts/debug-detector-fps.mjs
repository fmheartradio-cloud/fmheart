import sharp from "sharp";
import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-false-positive",
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

async function detect(url, label) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "FMHeartNewsBot/1.0",
      Referer: "https://www.nethnews.lk/",
    },
  });
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
    let dark = 0,
      red = 0,
      bright = 0,
      n = 0;
    for (let y = top; y < top + rh; y++) {
      for (let x = left; x < left + rw; x++) {
        const i = (y * w + x) * ch;
        const r0 = data[i],
          g0 = data[i + 1],
          b0 = data[i + 2];
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
  const lower = regionStats(
    Math.floor(w * 0.05),
    Math.floor(h * 0.55),
    Math.floor(w * 0.9),
    Math.floor(h * 0.4),
  );
  const brTiny = regionStats(
    Math.floor(w * 0.82),
    Math.floor(h * 0.86),
    Math.floor(w * 0.16),
    Math.floor(h * 0.12),
  );
  const netNewsBadge = tr.redRatio >= 0.1;
  const lowerGraphicText = lower.redRatio >= 0.12 && lower.brightRatio >= 0.08;
  const durationPill = brTiny.darkRatio >= 0.25 && brTiny.brightRatio >= 0.03;
  const likely =
    (netNewsBadge && lowerGraphicText) ||
    (netNewsBadge && durationPill) ||
    (lowerGraphicText && durationPill);
  log("M", "probe:false-positive", "poster detector on live covers", {
    label,
    url: url.slice(0, 120),
    netNewsBadge,
    lowerGraphicText,
    durationPill,
    likelyVideoPoster: likely,
    tr,
    lower,
  });
  console.log({ label, likely, netNewsBadge, lowerGraphicText, durationPill });
}

const imgs = [
  ["comanweltha", "https://www.nethnews.lk/wp-content/uploads/2026/07/Comanweltha-1.jpg"],
  ["ded", "https://www.nethnews.lk/wp-content/uploads/2026/07/ded-1.jpg"],
  ["japan-poster", "https://www.nethnews.lk/wp-content/uploads/2026/07/28-3.jpg"],
  ["police", "https://www.nethnews.lk/wp-content/uploads/2026/05/police-operation-2.jpg"],
];

for (const [label, url] of imgs) await detect(url, label);
