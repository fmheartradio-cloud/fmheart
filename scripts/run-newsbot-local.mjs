import { readFileSync } from "fs";

const envPath = process.argv[2] || ".env.local";
const text = readFileSync(envPath, "utf8");
let secret = null;
for (const line of text.split(/\n/)) {
  if (!line.startsWith("CRON_SECRET=")) continue;
  let value = line.slice("CRON_SECRET=".length).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  secret = value.replace(/\\n/g, "\n");
  break;
}
if (!secret) {
  console.error(`CRON_SECRET not found in ${envPath}`);
  process.exit(1);
}

const url =
  process.argv[3] || "https://fmheart-tau.vercel.app/api/cron/newsbot";
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
console.log("status", res.status);
console.log(await res.text());
