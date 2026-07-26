# FM Heart News Bot

## Flow

RSS → duplicate check → Firestore **draft** → Admin **Publish** at `/admin/articles`

Two runners (same drafts):

1. **Vercel Cron** (preferred on this stack) → `GET/POST /api/cron/newsbot`
2. **Python** under `services/newsbot/` (local / optional GitHub Actions)

---

## YOU must do (one-time) — I cannot do this for you

### A) Firebase service account
1. Firebase Console → project settings → Service accounts → **Generate new private key**
2. Keep the JSON private

### B) Vercel env vars
Project → Settings → Environment Variables (Production + Preview):

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON contents |
| `FIRESTORE_DB_ID` | `fmheart` |
| `CRON_SECRET` | Long random string (e.g. password manager) |

Redeploy after saving.

### C) Manual test after deploy
```powershell
curl -X POST "https://fmheart-tau.vercel.app/api/cron/newsbot" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Then open `/admin/articles` → Drafts → Publish.

---

## Optional: GitHub Actions every 10 min

Local commit may exist for `.github/workflows/newsbot.yml`. Push needs `workflow` scope:

```powershell
gh auth refresh -h github.com -s workflow
git push
```

Secret: `FIREBASE_SERVICE_ACCOUNT_JSON`

---

## Optional: local Python

```powershell
cd services/newsbot
pip install -r requirements.txt
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
$env:FIRESTORE_DB_ID="fmheart"
python main.py
```

---

## Notes

- Drafts only (copyright/quality).
- RSS only in this phase (no HTML scrape).
- Vercel Hobby may limit cron frequency; if 15‑min does not fire often enough, use GitHub Actions after granting `workflow` scope.
