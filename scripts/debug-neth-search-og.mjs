import { appendFileSync } from "node:fs";

const LOG = "debug-61a747.log";
const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "61a747",
    runId: "search-sports-og",
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

const queries = ["සෝමතිලක", "මිනගිට", "පොදුරද"];
for (const q of queries) {
  const searchUrl = `https://www.nethnews.lk/?s=${encodeURIComponent(q)}`;
  const r = await fetch(searchUrl, {
    headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
  });
  const html = await r.text();
  const links = [
    ...new Set(
      [...html.matchAll(/href=["'](https:\/\/www\.nethnews\.lk\/[^"'#?]+)/gi)].map(
        (m) => m[0].replace(/^href=["']/, ""),
      ),
    ),
  ]
    .filter((u) => !u.includes("/feed") && !u.includes("?s=") && !u.endsWith(".jpg"))
    .slice(0, 5);

  log("R", "search:neth", "search results", {
    q,
    status: r.status,
    links: links.slice(0, 5).map((u) => u.slice(0, 140)),
  });

  for (const link of links.slice(0, 2)) {
    const nr = await fetch(link, {
      headers: { "User-Agent": UA, Referer: "https://www.nethnews.lk/" },
    });
    const nh = await nr.text();
    const title = (nh.match(/<title[^>]*>([^<]+)/i)?.[1] || "").slice(0, 90);
    const og =
      nh.match(
        /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] || "";
    log("R", "search:article", "search hit og", {
      q,
      link: link.slice(0, 140),
      title,
      og: (og || "").slice(0, 140),
      ogFile: (og || "").split("/").pop() || "",
    });
    console.log({
      q,
      title: title.slice(0, 50),
      ogFile: (og || "").split("/").pop() || "(none)",
    });
  }
}
