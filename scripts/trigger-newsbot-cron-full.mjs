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
const r = await fetch("https://fmheart-tau.vercel.app/api/cron/newsbot", {
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(300000),
});
const data = await r.json();
console.log(JSON.stringify(data, null, 2));
