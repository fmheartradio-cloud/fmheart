# FM Heart accounts — Turso + Vercel

News, gossip, සහ CMS දැන් **Turso** (free SQLite cloud) එකේ තියෙනවා. Firebase ඕනේ නැහැ. Credit card එකක් ඕනේ නැහැ.

CMS login: `fmheartradio@gmail.com` + `ADMIN_PASSWORD`

වෙනත් email එකකටත් access දෙන්න නම්:
- `src/lib/admin.ts` allowlist එකට add කරන්න
- හෝ `.env.local` → `NEXT_PUBLIC_ADMIN_EMAILS=fmheartradio@gmail.com,other@email.com`

---

## 1) Turso database (free)

1. https://turso.tech → **Sign up with GitHub** (card අහන්නේ නැහැ)
2. Database create කරන්න. Name: `fmheart`
3. Copy these two values:

```
TURSO_DATABASE_URL=libsql://fmheart-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

CLI එකෙන් නම්:

```bash
npx @tursodatabase/cli auth login
npx @tursodatabase/cli db create fmheart
npx @tursodatabase/cli db show fmheart --url
npx @tursodatabase/cli db tokens create fmheart
```

---

## 2) Environment variables

`.env.local` (local) **සහ** Vercel → Project → Settings → Environment Variables (Production + Preview):

| Name | Value |
|------|--------|
| `TURSO_DATABASE_URL` | `libsql://...` |
| `TURSO_AUTH_TOKEN` | Turso token |
| `ADMIN_PASSWORD` | CMS login password (ශක්තිමත් එකක්) |
| `CRON_SECRET` | Newsbot cron bearer secret |
| `NEXT_PUBLIC_SITE_URL` | `https://fmheart.lk` |

Redeploy after saving Vercel env vars.

---

## 3) Vercel

Site already deploys from GitHub. Env vars දාලා **Redeploy** කරන්න.

Region: `sin1` (Singapore) — `vercel.json` එකේ තියෙනවා.

---

## 4) Newsbot

GitHub Actions every ~10 minutes: `POST https://www.fmheart.lk/api/cron/newsbot`

Repo secret: `CRON_SECRET` (same as Vercel).

Manual:

```powershell
$h=@{Authorization="Bearer YOUR_CRON_SECRET"}
Invoke-WebRequest -Uri "https://www.fmheart.lk/api/cron/newsbot" -Method POST -Headers $h -UseBasicParsing
```

---

## 5) Verify

```bash
npm run dev
```

- http://localhost:3000 — homepage + live radio
- http://localhost:3000/admin — email + ADMIN_PASSWORD
- Turso keys නැත්නම් public news හිස් (demo fake news නැහැ)

---

## Security checklist

- [ ] Turso token / ADMIN_PASSWORD / CRON_SECRET repo එකට commit නොකරන්න
- [ ] `.env.local` gitignore වෙලා තියෙනවා
- [ ] Vercel env vars production + preview දෙකටම set කරලා තියෙනවා
