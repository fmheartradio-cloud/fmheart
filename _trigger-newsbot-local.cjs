const fs = require("fs");
function readSecret(path) {
  const t = fs.readFileSync(path, "utf8");
  for (const line of t.split(/\n/)) {
    if (!line.startsWith("CRON_SECRET=")) continue;
    let v = line.slice("CRON_SECRET=".length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v.replace(/\\n/g, "\n");
  }
  return null;
}
const local = readSecret("C:/Users/narad/fmheart/.env.local");
const vercel = readSecret("C:/Users/narad/fmheart/.env.vercel.prod");
console.log("local_len", local ? local.length : 0);
console.log("vercel_file_len", vercel ? vercel.length : 0);
console.log("match", local === vercel);
const secret = local;
if (!secret) process.exit(1);
const url = "https://fmheart-tau.vercel.app/api/cron/newsbot";
fetch(url, { method: "POST", headers: { Authorization: "Bearer " + secret } })
  .then(async (r) => {
    console.log("status", r.status);
    const text = await r.text();
    console.log(text.slice(0, 2000));
  })
  .catch((e) => console.error(e));
