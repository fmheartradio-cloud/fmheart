import fs from "fs";

const envText = fs.readFileSync(".env.local", "utf8");
let secret = "";
for (const line of envText.split(/\n/)) {
  if (!line.startsWith("CRON_SECRET=")) continue;
  secret = line.slice("CRON_SECRET=".length).trim();
  if (
    (secret.startsWith('"') && secret.endsWith('"')) ||
    (secret.startsWith("'") && secret.endsWith("'"))
  ) {
    secret = secret.slice(1, -1);
  }
  break;
}

if (!secret) {
  console.error("CRON_SECRET not found in .env.local");
  process.exit(1);
}

const url = process.argv[2] || "https://fmheart-tau.vercel.app/api/cron/newsbot";
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.json().catch(async () => ({ raw: await res.text() }));
const results = Array.isArray(body.results) ? body.results : [];
const backfilled = results.reduce((sum, row) => sum + (row.backfilled || 0), 0);
const created = results.reduce((sum, row) => sum + (row.created || 0), 0);

console.log(
  JSON.stringify(
    {
      status: res.status,
      ok: body.ok,
      backfilled,
      created,
      bySource: results.map((row) => ({
        source: row.source,
        backfilled: row.backfilled,
        created: row.created,
        skipped: row.skipped,
        error: row.error,
      })),
    },
    null,
    2,
  ),
);
