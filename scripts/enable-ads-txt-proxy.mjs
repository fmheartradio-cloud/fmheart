/**
 * Enable Cloudflare orange-cloud (proxy) on fmheart.lk so the ads.txt worker
 * intercepts https://fmheart.lk/ads.txt before Vercel's apex→www 308.
 *
 * Usage (one-time):
 *   1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
 *      Template: "Edit zone DNS" for fmheart.lk
 *   2. set CLOUDFLARE_API_TOKEN=your_token
 *   3. node scripts/enable-ads-txt-proxy.mjs
 */
const ZONE_ID = "9097533561a8b01e7aa00e799fb0e17e";
const APEX = "fmheart.lk";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!TOKEN) {
  console.error(
    "Missing CLOUDFLARE_API_TOKEN. Create an Edit zone DNS token for fmheart.lk.",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

const res = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100`,
  { headers },
);
const data = await res.json();
if (!data.success) {
  console.error("DNS list failed:", data.errors);
  process.exit(1);
}

const apexRecords = data.result.filter(
  (r) => r.name === APEX || r.name === `${APEX}.`,
);
if (!apexRecords.length) {
  console.error(`No DNS record found for ${APEX}`);
  process.exit(1);
}

for (const rec of apexRecords) {
  if (rec.proxied) {
    console.log(`OK already proxied: ${rec.type} ${rec.name} (${rec.id})`);
    continue;
  }
  const patch = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rec.id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ proxied: true }),
    },
  );
  const patched = await patch.json();
  if (!patched.success) {
    console.error(`Failed to proxy ${rec.type} ${rec.name}:`, patched.errors);
    process.exit(1);
  }
  console.log(`Enabled proxy: ${rec.type} ${rec.name}`);
}

const check = await fetch(`https://${APEX}/ads.txt`, { redirect: "manual" });
const body = await check.text();
console.log(`\nVerify ${APEX}/ads.txt → HTTP ${check.status}`);
console.log(body.trim());
if (check.status === 200 && body.includes("pub-8733607596459970")) {
  console.log("\nAdSense should show Authorized after the next crawl (24–72h).");
} else {
  console.log(
    "\nStill not 200 — wait a few minutes for DNS or check Cloudflare DNS manually.",
  );
}
