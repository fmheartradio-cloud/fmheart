const fs = require("fs");
const path = ".env.vercel.prod";
const t = fs.readFileSync(path, "utf8");
let secret = null;
for (const line of t.split(/\n/)) {
  if (!line.startsWith("CRON_SECRET=")) continue;
  let v = line.slice("CRON_SECRET=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  secret = v.replace(/\\n/g, "\n");
  break;
}
if (!secret) {
  console.error("no secret");
  process.exit(1);
}
console.log("secret_len", secret.length);
const url = "https://fmheart-tau.vercel.app/api/cron/newsbot";
fetch(url, { method: "POST", headers: { Authorization: "Bearer " + secret } })
  .then(async (r) => {
    console.log("status", r.status);
    console.log(await r.text());
  })
  .catch((e) => console.error(e));
