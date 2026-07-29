/**
 * Run news ingest + cover cleanup against Firebase (uses .env.local).
 */
import { readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (process.env[m[1]]) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  } catch {
    /* ignore */
  }
}

loadEnvLocal();

const { runNewsIngest } = await import("../src/lib/newsbot/ingest.ts");

const result = await runNewsIngest({ maxPerSource: 8 });
const payload = {
  sessionId: "61a747",
  runId: "post-fix-ingest",
  hypothesisId: "C",
  location: "scripts/run-newsbot-cleanup.mjs",
  message: "newsbot ingest+cleanup finished",
  data: {
    ok: result.ok,
    sources: (result.results || []).map((r) => ({
      source: r.source,
      fetched: r.fetched,
      created: r.created,
      backfilled: r.backfilled,
      skipped: r.skipped,
    })),
  },
  timestamp: Date.now(),
};
appendFileSync("debug-61a747.log", JSON.stringify(payload) + "\n");
console.log(JSON.stringify(payload.data, null, 2));
