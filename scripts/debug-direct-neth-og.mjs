import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "fetch-page-og",
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

const urls = [
  "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/",
  "https://www.nethnews.lk/feed/",
];

// Search neth home for weightlifting article link
const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const homeHtml = await home.text();
const liftHref =
  homeHtml.match(
    /href=["'](https:\/\/www\.nethnews\.lk\/[^"']+)["'][^>]*>[\s\S]{0,120}බර ඉසිලීමේ/i,
  )?.[1] ||
  homeHtml.match(
    /href=["'](https:\/\/www\.nethnews\.lk\/[^"']*සෝමතිලක[^"']*)["']/i,
  )?.[1];

if (liftHref) urls.unshift(liftHref);

for (const url of urls) {
  if (url.includes("/feed")) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    const xml = await r.text();
    // find any item with media
    const chunk = xml.split(/<item[\s>]/i)[1] || "";
    const link = (chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .trim();
    if (link) urls.push(link);
    continue;
  }
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const html = await r.text();
  const og =
    html.match(
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    )?.[1] ||
    "";
  const title = (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 80);
  log("Q", "fetch:neth-article", "direct neth article og extract", {
    url: url.slice(0, 160),
    status: r.status,
    finalUrl: r.url.slice(0, 160),
    title,
    og: (og || "").slice(0, 140),
    hasOg: Boolean(og),
    looksLikeHtml: /<html/i.test(html),
    len: html.length,
  });
  console.log({
    title,
    status: r.status,
    og: (og || "").split("/").pop() || "(none)",
    html: html.length,
  });
}

console.log("liftHref", liftHref || "(not found on home)");
