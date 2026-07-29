import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-article-source",
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
  headers: { "User-Agent": "FMHeartNewsBot/1.0" },
});
const html = await home.text();
const hrefs = [
  ...new Set(
    [...html.matchAll(/href="(\/news\/[^"]+)"/g)].map((m) => m[1]),
  ),
].slice(0, 8);

for (const href of hrefs) {
  const r = await fetch(`https://fmheart-tau.vercel.app${href}`, {
    headers: { "User-Agent": "FMHeartNewsBot/1.0" },
  });
  const t = await r.text();
  const title = (t.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const cover =
    t.match(
      /src="(https:\/\/www\.nethnews\.lk\/wp-content\/uploads\/[^"]+)"/,
    )?.[1] ||
    t.match(/src="(\/logo\/fmheart-cover\.png)"/)?.[1] ||
    "";
  const sourceUrl =
    t.match(
      /href="(https:\/\/www\.nethnews\.lk\/[^"]+)"/,
    )?.[1] || "";

  let og = "";
  if (sourceUrl) {
    const nr = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "FMHeartNewsBot/1.0",
        Referer: "https://www.nethnews.lk/",
      },
    });
    const nh = await nr.text();
    og =
      nh.match(
        /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] ||
      nh.match(
        /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      )?.[1] ||
      "";
  }

  log("K", "probe:article-source", "article cover vs neth og", {
    href,
    title,
    cover: cover.slice(0, 140),
    sourceUrl: sourceUrl.slice(0, 140),
    og: og.slice(0, 140),
    mismatch: Boolean(cover && og && cover !== og),
    isFallback: /fmheart-cover/i.test(cover),
  });
  console.log({
    title: title.slice(0, 40),
    isFallback: /fmheart-cover/i.test(cover),
    mismatch: cover !== og,
    cover: cover.split("/").pop(),
    og: og.split("/").pop(),
  });
}
