import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => {
      const i = l.indexOf("=");
      if (i <= 0) return null;
      let v = l.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i), v];
    })
    .filter(Boolean),
);

const secret = env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET missing");
  process.exit(1);
}

const r = await fetch("https://fmheart-tau.vercel.app/api/cron/newsbot", {
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(300000),
});
const text = await r.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = { raw: text.slice(0, 800) };
}

console.log(JSON.stringify({ status: r.status, ...data }, null, 2));
