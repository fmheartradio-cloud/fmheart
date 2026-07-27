# Newsbot external cron (fallback)

Use this if GitHub Actions is unavailable. The endpoint is the same one GitHub Actions calls.

## cron-job.org (free)

1. Sign in at [cron-job.org](https://cron-job.org/en/).
2. **Create cronjob** → **Advanced**.
3. **URL:** `https://fmheart-tau.vercel.app/api/cron/newsbot`
4. **Schedule:** every **10 minutes** (`*/10 * * * *` or the site’s “every 10 minutes” preset).
5. **Request method:** `POST`
6. **Request headers** (add one row):
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET`
   - Replace `YOUR_CRON_SECRET` with the `CRON_SECRET` value from your local `.env.local` or Vercel project env vars (never commit it).
7. Save and enable the job.

Expected success: HTTP **200** and JSON with `"ok": true`.

## PowerShell one-liner (manual or Task Scheduler)

From repo root, with `CRON_SECRET` in `.env.local`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\trigger-newsbot.ps1"
```

Or inline (paste your secret locally only):

```powershell
$h=@{Authorization="Bearer YOUR_CRON_SECRET"}; Invoke-WebRequest -Uri "https://fmheart-tau.vercel.app/api/cron/newsbot" -Method POST -Headers $h -UseBasicParsing | Select-Object StatusCode, Content
```

## Windows Task Scheduler

- **Trigger:** repeat every 10 minutes, indefinitely.
- **Action:** `powershell.exe`
- **Arguments:** `-NoProfile -ExecutionPolicy Bypass -File "C:\Users\narad\fmheart\scripts\trigger-newsbot.ps1"`

## Primary schedule (already live)

**GitHub Actions** (`.github/workflows/newsbot.yml`) runs `*/10 * * * *` on `master` and POSTs to the same URL using the repo secret `CRON_SECRET`.

Manual run:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" workflow run newsbot.yml
```
