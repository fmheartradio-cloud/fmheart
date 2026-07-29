/**
 * Smoke-test feed/list fetch + one article body/cover per Sinhala source.
 * Usage: node scripts/smoke-test-sources.mjs
 */
import { runNewsIngest, DEFAULT_NEWS_SOURCES } from "../src/lib/newsbot/ingest.ts";

const UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk)";

async function probeFeed(src) {
  if (src.rss) {
    const r = await fetch(src.rss, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, */*" },
      signal: AbortSignal.timeout(20000),
    });
    const xml = await r.text();
    const items = (xml.match(/<item/gi) || []).length;
    return { ok: r.ok, status: r.status, items, mode: "rss" };
  }
  if (src.listUrl) {
    const r = await fetch(src.listUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    const html = await r.text();
    let links = 0;
    if (src.id === "newsfirst-sinhala") {
      links = (html.match(/href=["']\/\d{4}\/\d{2}\/\d{2}\//gi) || []).length;
    } else if (src.id === "lankaenews") {
      links = (html.match(/href=["']\/news\/\d+\/en["']/gi) || []).length;
    }
    return { ok: r.ok, status: r.status, items: links, mode: "list" };
  }
  return { ok: false, status: 0, items: 0, mode: "none" };
}

console.log("=== Feed probes ===");
for (const src of DEFAULT_NEWS_SOURCES) {
  const probe = await probeFeed(src);
  console.log(`${src.name}: ${probe.mode} status=${probe.status} links/items≈${probe.items}`);
}

if (process.env.SMOKE_INGEST === "1" && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.log("\n=== Ingest dry run (max 1 per source) ===");
  const result = await runNewsIngest({ maxPerSource: 1 });
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("\n(Set FIREBASE_SERVICE_ACCOUNT_JSON + SMOKE_INGEST=1 to run ingest)");
}
