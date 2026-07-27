"""
FM Heart news collector — Phase 1 (RSS → Firestore drafts).

Usage:
  cd services/newsbot
  pip install -r requirements.txt
  set GOOGLE_APPLICATION_CREDENTIALS=path\\to\\serviceAccount.json
  set FIRESTORE_DB_ID=fmheart
  python main.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

from fetch_rss import fetch_rss
from firebase_client import save_draft
from category import infer_news_category

ROOT = Path(__file__).resolve().parent
# Load repo .env.local if present (optional)
load_dotenv(ROOT.parents[1] / ".env.local")
load_dotenv(ROOT / ".env")


def main() -> int:
    cfg_path = ROOT / "sources.yaml"
    with cfg_path.open(encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    sources = [s for s in (cfg.get("sources") or []) if s.get("active", True)]
    status = cfg.get("default_status") or "published"
    max_per = int(cfg.get("max_per_source") or 8)

    if not sources:
        print("No active sources in sources.yaml", file=sys.stderr)
        return 1

    created = 0
    skipped = 0
    errors = 0

    for src in sources:
        name = src.get("name") or src.get("id") or "Source"
        rss = src.get("rss")
        list_url = src.get("list_url")
        if not rss:
            if list_url:
                print(f"[skip] {name}: list_url sources use the Vercel/Next.js runner")
            else:
                print(f"[skip] {name}: no rss url")
            continue
        print(f"[fetch] {name} ← {rss}")
        try:
            entries = fetch_rss(rss, limit=max_per)
        except Exception as err:
            errors += 1
            print(f"[error] {name}: {err}", file=sys.stderr)
            continue

        for entry in entries:
            entry["source"] = name
            entry["sourceId"] = str(src.get("id") or "")
            entry["sourceDefaultCategory"] = str(src.get("category") or "දේශීය")
            entry["category"] = infer_news_category(
                source_id=str(src.get("id") or ""),
                source_default_category=str(src.get("category") or "දේශීය"),
                source_url=str(entry.get("sourceUrl") or ""),
                title=str(entry.get("title") or ""),
                excerpt=str(entry.get("excerpt") or ""),
                rss_categories=entry.get("rssCategories") or [],
            )
            entry["status"] = status
            entry["tags"] = [name, entry["category"]]
            try:
                doc_id = save_draft(entry)
                if doc_id:
                    created += 1
                    print(f"  + {status} {doc_id}: {entry['title'][:60]}")
                else:
                    skipped += 1
            except Exception as err:
                errors += 1
                print(f"  ! save failed: {err}", file=sys.stderr)

    print(f"Done. created={created} skipped={skipped} errors={errors}")
    return 0 if errors == 0 or created > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
