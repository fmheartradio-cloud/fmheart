# FM Heart News Bot

## Flow

RSS / list page → duplicate check → Turso **published** articles → site `/news`

Two runners (same endpoint):

1. **GitHub Actions** every **10 minutes** → `POST https://www.fmheart.lk/api/cron/newsbot` (preferred)
2. **Vercel Cron** daily backup → same endpoint (`vercel.json`, `0 3 * * *`)

Primary ingest logic lives in Next.js: `src/lib/newsbot/ingest.ts`.

Optional local Python runner under `services/newsbot/` mirrors sources in `sources.yaml`.

---

## Sinhala sources (6)

| Source | Feed / list |
|--------|-------------|
| Neth News | `https://www.nethnews.lk/feed/` |
| News First Sinhala | `https://sinhala.newsfirst.lk/` (homepage list scrape) |
| Ada Derana Sinhala | `https://sinhala.adaderana.lk/rsshotnews.php` |
| BBC Sinhala | `https://feeds.bbci.co.uk/sinhala/rss.xml` |
| Lanka eNews | `https://www.lankaenews.com/` → `/news/{id}/si` |
| Lanka Hot News | `https://www.lankahotnews.net/rss.xml` |

Categories are inferred per article (URL path, RSS tags, keywords) — not a single blanket default.

---

## YOU must do (one-time)

### A) Turso (free, no credit card)
1. https://turso.tech → Sign up with GitHub
2. Create database `fmheart`
3. Copy URL + token

### B) Vercel env vars
Project → Settings → Environment Variables (Production + Preview):

| Name | Value |
|------|--------|
| `TURSO_DATABASE_URL` | `libsql://...` |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `ADMIN_PASSWORD` | CMS login password |
| `CRON_SECRET` | Long random string (e.g. password manager) |

Redeploy after saving.

### C) GitHub Actions secret (10‑min schedule)

Repository → Settings → Secrets and variables → Actions:

| Name | Value |
|------|--------|
| `CRON_SECRET` | Same value as Vercel `CRON_SECRET` |

If pushing `.github/workflows/newsbot.yml` fails, refresh workflow scope:

```powershell
gh auth refresh -h github.com -s workflow
git push
```

### D) Manual test after deploy

```powershell
node scripts/run-newsbot-local.mjs .env.local
```

Then open `/admin/articles` → Drafts → Publish.

---

## Optional: local Python

```powershell
cd services/newsbot
pip install -r requirements.txt
$env:TURSO_DATABASE_URL="libsql://..."
$env:TURSO_AUTH_TOKEN="..."
python main.py
```

---

## Notes

- Drafts only (copyright/quality).
- Sinhala-only filter on ingest.
- Full article body + cover image scraped when RSS teaser is short.
- Source attribution lines (e.g. `(ලංකා ඊ නිව්ස් …)`) stripped from body; `source` / `sourceUrl` fields keep provenance.
- Vercel Hobby limits cron to daily; GitHub Actions handles ~10‑minute polling.
