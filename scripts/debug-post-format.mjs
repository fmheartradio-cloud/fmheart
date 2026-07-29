import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "probe-post-format",
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

async function inspect(url, label) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const html = await r.text();
  const bodyClass = html.match(/<body[^>]*class=["']([^"']+)["']/i)?.[1] || "";
  const articleClass =
    html.match(/<article[^>]*class=["']([^"']+)["']/i)?.[1] || "";
  const formats = [
    ...html.matchAll(
      /(?:post-format|format-|type-video|video-post|has-post-thumbnail|td-post)[a-z0-9_-]*/gi,
    ),
  ]
    .map((m) => m[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 30);
  const og =
    html.match(
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] || "";
  const ogType =
    html.match(
      /property=["']og:type["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(
      /content=["']([^"']+)["'][^>]+property=["']og:video["']/i,
    )?.[1] ||
    "";
  const hasOgVideo = /property=["']og:video/i.test(html);
  const durationMeta = [
    ...html.matchAll(/duration|video:duration|iso8601/gi),
  ]
    .slice(0, 5)
    .map((m) => m[0]);
  log("H4", "probe:post-format", "neth post format signals", {
    label,
    url: url.slice(0, 120),
    bodyClass: bodyClass.slice(0, 200),
    articleClass: articleClass.slice(0, 200),
    formats,
    og: og.slice(0, 120),
    hasOgVideo,
    ogType,
    durationMeta,
    title: (html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 60),
  });
  console.log(
    JSON.stringify(
      {
        label,
        bodyClass: bodyClass.slice(0, 120),
        articleClass: articleClass.slice(0, 120),
        formats: formats.slice(0, 15),
        hasOgVideo,
        og: og.slice(0, 80),
      },
      null,
      2,
    ),
  );
}

await inspect(
  "https://www.nethnews.lk/breaking-news/foreign-news/%e0%b6%a2%e0%b6%b4%e0%b7%8f%e0%b6%b1%e0%b6%ba%e0%b7%9a-%e0%b6%89%e0%b6%af%e0%b7%92%e0%b6%9a%e0%b7%92%e0%b6%bb%e0%b7%93%e0%b6%b8%e0%b6%a7-%e0%b6%ba%e0%b7%9d%e0%b6%a2%e0%b7%92%e0%b6%ad-%e0%b6%b8/",
  "japan-video",
);

const home = await fetch("https://www.nethnews.lk/", {
  headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
});
const homeHtml = await home.text();
const link = [
  ...homeHtml.matchAll(/href=["'](https:\/\/www\.nethnews\.lk\/[^"'#]+)["']/gi),
]
  .map((m) => m[1])
  .find((u) => /local-news|breaking-news/i.test(u) && !u.includes("japan") && !u.includes("%e0%b6%a2%e0%b6%b4"));

if (link) await inspect(link, "sample-other");
