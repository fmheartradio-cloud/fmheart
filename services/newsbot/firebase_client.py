"""Firestore writer for FM Heart articles (named DB: fmheart)."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore


_db = None


def _slugify(title: str) -> str:
    ascii_part = re.sub(r"[^a-z0-9]+", "-", title.lower())
    ascii_part = ascii_part.strip("-")[:48]
    suffix = format(int(datetime.now(tz=timezone.utc).timestamp()), "x")
    if len(ascii_part) >= 3:
        return f"{ascii_part}-{suffix}"
    return f"news-{suffix}"


def _reading_time(body: str) -> int:
    words = len([w for w in body.split() if w])
    return max(1, (words + 179) // 180)


def get_db():
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        raw_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if raw_json:
            info = json.loads(raw_json)
            cred = credentials.Certificate(info)
        elif cred_path and os.path.isfile(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            raise RuntimeError(
                "Set GOOGLE_APPLICATION_CREDENTIALS (path) or "
                "FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)."
            )
        firebase_admin.initialize_app(cred)

    db_id = os.environ.get("FIRESTORE_DB_ID", "fmheart").strip() or "fmheart"
    _db = firestore.client(database_id=db_id)
    return _db


def source_hash(source_url: str, title: str) -> str:
    key = f"{(source_url or '').strip().lower()}|{(title or '').strip().lower()}"
    return sha256(key.encode("utf-8")).hexdigest()[:40]


def already_ingested(db, hash_value: str) -> bool:
    q = (
        db.collection("articles")
        .where("sourceHash", "==", hash_value)
        .limit(1)
        .stream()
    )
    return any(True for _ in q)


def title_too_similar(db, title: str, threshold: float = 0.9) -> bool:
    """Lightweight duplicate guard: exact / near-exact title match in recent drafts+published."""
    needle = re.sub(r"\s+", " ", (title or "").strip().lower())
    if not needle:
        return False
    # Scan a bounded window — enough for bot cadence without full collection scan cost
    docs = (
        db.collection("articles")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(80)
        .stream()
    )
    for doc in docs:
        other = re.sub(r"\s+", " ", str(doc.to_dict().get("title") or "").strip().lower())
        if not other:
            continue
        if other == needle:
            return True
        # simple token Jaccard
        a, b = set(needle.split()), set(other.split())
        if not a or not b:
            continue
        j = len(a & b) / len(a | b)
        if j >= threshold:
            return True
    return False


def save_draft(item: dict[str, Any]) -> str | None:
    """Insert article as draft. Returns doc id or None if skipped."""
    db = get_db()
    url = (item.get("sourceUrl") or "").strip()
    title = (item.get("title") or "").strip()
    if not title:
        return None

    h = source_hash(url, title)
    if already_ingested(db, h):
        return None
    if title_too_similar(db, title):
        return None

    now = datetime.now(tz=timezone.utc).isoformat()
    excerpt = (item.get("excerpt") or title)[:400]
    body = (item.get("body") or excerpt).strip()
    source_name = item.get("source") or "Unknown"
    # Attribution footer — do not republish full third-party text as original
    if url and "මූලාශ්‍ර" not in body:
        body = f"{body}\n\n—\nමූලාශ්‍ර: {source_name}\n{url}"

    status = item.get("status") or "draft"
    payload = {
        "type": "news",
        "title": title,
        "slug": _slugify(title),
        "excerpt": excerpt,
        "body": body,
        "category": item.get("category") or "දේශීය",
        "coverImage": (item.get("coverImage") or "").strip(),
        "author": f"FM Heart · {source_name}",
        "status": status,
        "tags": item.get("tags") or [source_name],
        "readingTimeMin": _reading_time(body),
        "views": 0,
        "createdAt": now,
        "updatedAt": now,
        "publishedAt": now if status == "published" else None,
        "seoTitle": title,
        "seoDescription": excerpt,
        "source": source_name,
        "sourceUrl": url,
        "sourceHash": h,
        "ingestedBy": "newsbot",
    }

    _, ref = db.collection("articles").add(payload)
    return ref.id
