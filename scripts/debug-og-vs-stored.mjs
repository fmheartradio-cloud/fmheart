import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-og-unique",
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

function og(html) {
  return (
    html.match(
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1] ||
    ""
  );
}

// From home HTML, find article hrefs near titles
const home = await fetch("https://fmheart-tau.vercel.app/", {
  headers: { "User-Agent": UA },
});
const homeHtml = await home.text();

const titleBits = ["බර ඉසිලීමේ", "දේවාලයේ", "100M", "මිනගිට"];
for (const bit of titleBits) {
  const idx = homeHtml.indexOf(bit);
  if (idx < 0) {
    log("K", "probe:og", "title missing on home", { bit });
    continue;
  }
  const win = homeHtml.slice(Math.max(0, idx - 1200), idx + 100);
  const href =
    [...win.matchAll(/href="(\/news\/[^"]+)"/g)].map((m) => m[1]).pop() || "";
  const cover =
    [...win.matchAll(/src="(https:\/\/www\.nethnews\.lk\/[^"]+)"/g)].map(
      (m) => m[1],
    ).pop() || "";
  log("K", "probe:stored-cover", "card href/cover near title", {
    bit,
    href,
    cover: cover.slice(0, 140),
  });

  if (!href) continue;
  // get article page for sourceUrl
  const art = await fetch(`https://fmheart-tau.vercel.app${href}`, {
    headers: { "User-Agent": UA },
  });
  const artHtml = await art.text();
  const sourceUrl =
    artHtml.match(/href="(https:\/\/www\.nethnews\.lk\/[^"]+)"[^>]*>\s*Neth/i)?.[1] ||
    artHtml.match(/https:\/\/www\.nethnews\.lk\/[^"'\s]+/)?.[0] ||
    "";
  if (!sourceUrl) {
    log("K", "probe:og", "no sourceUrl on article page", { href });
    continue;
  }
  const nr = await fetch(sourceUrl, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const nhtml = await nr.text();
  const ogUrl = og(nhtml);
  log("K", "probe:og", "neth og vs stored cover", {
    bit,
    href,
    sourceUrl: sourceUrl.slice(0, 140),
    storedCover: cover.slice(0, 140),
    og: ogUrl.slice(0, 140),
    mismatch: Boolean(cover && ogUrl && cover !== ogUrl),
    ogIsComanweltha: /Comanweltha/i.test(ogUrl),
    storedIsComanweltha: /Comanweltha/i.test(cover),
  });
  console.log({
    bit,
    mismatch: cover !== ogUrl,
    stored: cover.slice(0, 60),
    og: ogUrl.slice(0, 60),
  });
}

// Hotlink check: fetch image WITH browser-like referer from our site
const img = "https://www.nethnews.lk/wp-content/uploads/2026/07/Comanweltha-1.jpg";
for (const referer of [
  "https://fmheart-tau.vercel.app/",
  "http://127.0.0.1:3000/",
  "https://www.nethnews.lk/",
  "",
]) {
  try {
    const r = await fetch(img, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(referer ? { Referer: referer } : {}),
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    const buf = Buffer.from(await r.arrayBuffer());
    log("L", "probe:hotlink", "image fetch with referer", {
      referer: referer || "(none)",
      status: r.status,
      bytes: buf.length,
      contentType: r.headers.get("content-type"),
    });
    console.log({ referer: referer || "(none)", status: r.status, bytes: buf.length });
  } catch (e) {
    log("L", "probe:hotlink", "image fetch failed", {
      referer,
      error: String(e.message || e),
    });
  }
}
