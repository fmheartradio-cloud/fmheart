import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "neth-html-inspect",
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

const home = await fetch("https://fmheart-tau.vercel.app/", {
  headers: { "User-Agent": UA },
});
const html = await home.text();
const href =
  [...html.matchAll(/href="(\/news\/[^"]+)"/g)].map((m) => m[1]).find((h) =>
    html.includes("බර ඉසිලීමේ") &&
    html.indexOf(h) < html.indexOf("බර ඉසිලීමේ") + 500 &&
    html.indexOf(h) > html.indexOf("බර ඉසිලීමේ") - 800,
  ) ||
  [...html.matchAll(/href="(\/news\/[^"]+)"/g)].map((m) => m[1])[4];

const ar = await fetch(`https://fmheart-tau.vercel.app${href}`, {
  headers: { "User-Agent": UA },
});
const at = await ar.text();
const sourceUrls = [
  ...new Set(
    [...at.matchAll(/https:\/\/www\.nethnews\.lk\/[^"'\\\s>#]+/g)].map((m) =>
      m[0].replace(/&amp;/g, "&"),
    ),
  ),
].slice(0, 10);

log("O", "inspect:fm-article", "fmheart article neth links", {
  href,
  sourceUrls,
  title: (at.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80),
});

for (const sourceUrl of sourceUrls.slice(0, 3)) {
  const nr = await fetch(sourceUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      Referer: "https://www.nethnews.lk/",
    },
    redirect: "follow",
  });
  const nh = await nr.text();
  const metas = [...nh.matchAll(/<meta[^>]+>/gi)]
    .map((m) => m[0])
    .filter((t) => /og:image|twitter:image|og:title/i.test(t))
    .slice(0, 8);
  log("O", "inspect:neth-html", "neth page meta/og", {
    sourceUrl: sourceUrl.slice(0, 160),
    finalUrl: nr.url,
    status: nr.status,
    len: nh.length,
    title: (nh.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 100),
    hasOgImageString: /og:image/i.test(nh),
    metas,
    headSnippet: nh.slice(0, 1200).replace(/\s+/g, " "),
  });
  console.log({
    sourceUrl: sourceUrl.slice(0, 80),
    status: nr.status,
    finalUrl: nr.url.slice(0, 80),
    title: (nh.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 60),
    hasOg: /og:image/i.test(nh),
    metas: metas.length,
  });
}
