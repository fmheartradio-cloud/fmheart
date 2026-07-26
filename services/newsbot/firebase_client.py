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


def find_existing_by_hash(db, hash_value: str):
    q = (
        db.collection("articles")
        .where("sourceHash", "==", hash_value)
        .limit(1)
        .stream()
    )
    for doc in q:
        return doc.id, doc.to_dict()
    return None, None


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
    from fetch_rss import ADMIN_BODY_MIN_CHARS, is_body_too_short
    from sinhala_script import has_sinhala_news_text

    db = get_db()
    url = (item.get("sourceUrl") or "").strip()
    title = (item.get("title") or "").strip()
    if not title:
        return None

    excerpt = (item.get("excerpt") or "").strip()
    if not has_sinhala_news_text(title, excerpt):
        return None

    h = source_hash(url, title)
    existing_id, existing = find_existing_by_hash(db, h)
    if existing_id and existing:
        existing_cover = (existing.get("coverImage") or "").strip()
        existing_body = (existing.get("body") or "").strip()
        needs_cover = not existing_cover
        needs_body = (
            len(existing_body) < ADMIN_BODY_MIN_CHARS
            and is_body_too_short(existing_body, title)
        )
        updates: dict[str, Any] = {}
        page_data = None
        if url and (needs_cover or needs_body):
            from fetch_rss import fetch_article_page_data

            page_data = fetch_article_page_data(url)
        if needs_cover:
            cover = (item.get("coverImage") or "").strip()
            if not cover and page_data:
                cover = (page_data.get("coverImage") or "").strip()
            if cover:
                updates["coverImage"] = cover
        if needs_body:
            fuller_body = (item.get("body") or "").strip()
            if is_body_too_short(fuller_body, title) and page_data:
                fuller_body = (page_data.get("body") or fuller_body).strip()
            if (
                fuller_body
                and len(fuller_body) > len(existing_body)
                and not is_body_too_short(fuller_body, title)
            ):
                from fetch_rss import cap_body, _reading_time

                updates["body"] = cap_body(fuller_body)
                updates["readingTimeMin"] = _reading_time(updates["body"])

        from category import (
            infer_news_category,
            merge_ingest_tags,
            should_upgrade_ingested_category,
        )

        source_default = str(item.get("sourceDefaultCategory") or "දේශීය")
        inferred_category = infer_news_category(
            source_id=str(item.get("sourceId") or ""),
            source_default_category=source_default,
            source_url=url,
            title=title,
            excerpt=str(item.get("excerpt") or ""),
            rss_categories=item.get("rssCategories") or [],
        )
        existing_category = str(existing.get("category") or "").strip()
        if should_upgrade_ingested_category(
            existing_category, source_default, inferred_category
        ):
            updates["category"] = inferred_category
            updates["tags"] = merge_ingest_tags(
                existing.get("tags"),
                str(item.get("source") or "Unknown"),
                source_default,
                inferred_category,
            )

        if updates:
            now = datetime.now(tz=timezone.utc).isoformat()
            updates["updatedAt"] = now
            db.collection("articles").document(existing_id).update(updates)
            return existing_id
        return None
    if title_too_similar(db, title):
        return None

    now = datetime.now(tz=timezone.utc).isoformat()
    excerpt = (item.get("excerpt") or title)[:400]
    from fetch_rss import cap_body

    body = cap_body((item.get("body") or excerpt).strip())
    source_name = item.get("source") or "Unknown"

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
