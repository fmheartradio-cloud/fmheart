# Fix AdSense ads.txt "Not found"

AdSense checks **`https://fmheart.lk/ads.txt`**. Vercel redirects apex → www (308), so Google often marks **Not found** even though `www.fmheart.lk/ads.txt` is correct.

Pick **one** fix:

## Option A — Vercel (recommended, 1 minute)

> **Do not** change Output Directory to `public` or Framework to "Other" — that
> breaks the site (only ads.txt loads). Keep Framework = **Next.js**.

1. [Vercel → fmheart → Settings → Domains](https://vercel.com/fm-heart/fmheart/settings/domains)
2. **`fmheart.lk`** → ⋮ → **Set as Primary Domain**
3. After ~2 min, verify: `https://fmheart.lk/ads.txt` shows `google.com, pub-8733607596459970...` with **no redirect**
4. AdSense → Sites → recheck in 24–72h → should return **Authorized**

## Option B — Cloudflare proxy + worker (already deployed)

Worker `fmheart-ads-txt` serves `/ads.txt` when traffic goes through Cloudflare.

1. [Cloudflare DNS for fmheart.lk](https://dash.cloudflare.com/97aaa0129025825a57872de7a87d0351/fmheart.lk/dns/records)
2. **`fmheart.lk` A/CNAME record** → click grey cloud → **orange cloud (Proxied)**
3. Or run (needs API token with Edit zone DNS):
   ```bash
   set CLOUDFLARE_API_TOKEN=your_token
   node scripts/enable-ads-txt-proxy.mjs
   ```
4. Verify `https://fmheart.lk/ads.txt` → HTTP **200**

Redeploy worker if needed:
```bash
cd cloudflare && npx wrangler deploy -c ads-txt-wrangler.toml
```
