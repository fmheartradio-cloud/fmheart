# FM Heart News Bot

**Order of operations**

1. Service account + local dry run  
2. Admin review drafts at `/admin/articles`  
3. GitHub Actions 24/7 schedule (this repo)  
4. Later: AI rewrite / more sources  

## Flow

RSS feeds → duplicate check → Firestore `articles` as **draft** → you **Publish** in Admin.

## Why drafts?

Full republication of other sites' articles can cause copyright issues. This bot:

- Uses **RSS only** (no HTML scrape in Phase 1)
- Saves feed text with **source attribution**
- Sets `status: draft` for review before publish

---

## Step 1 — Firebase service account

1. [Firebase Console](https://console.firebase.google.com) → project `fm-heart-eghluo`  
2. Project settings → Service accounts → **Generate new private key**  
3. Keep the JSON private — **never commit it**

Firestore database id must be **`fmheart`**.

---

## Step 2 — Local run

```bash
cd services/newsbot
pip install -r requirements.txt
```

PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
$env:FIRESTORE_DB_ID="fmheart"
python main.py
```

Or paste JSON:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON=(Get-Content -Raw serviceAccount.json)
$env:FIRESTORE_DB_ID="fmheart"
python main.py
```

Edit `sources.yaml` to enable/disable feeds.

Then open `/admin/articles` → **Drafts** → **Publish**.

---

## Step 3 — GitHub Actions (every 10 minutes)

Workflow: [`.github/workflows/newsbot.yml`](../../.github/workflows/newsbot.yml)

Repo → **Settings → Secrets and variables → Actions** → add:

| Secret | Value |
|--------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire service account JSON (one line / raw file contents) |
| `FIRESTORE_DB_ID` | `fmheart` (optional; defaults in workflow) |

Then: **Actions → News Collector → Run workflow** (manual test).

After that, cron runs about every 10 minutes.

---

## Firestore fields

Matches site `CmsArticle`, plus:

- `source`, `sourceUrl`, `sourceHash`
- `ingestedBy: "newsbot"`
- `status: "draft"`

---

## Later (Phase 2+)

- OpenAI Sinhala rewrite before draft/publish  
- Extra RSS sources  
- Optional HTML adapters only where ToS/robots allow  
