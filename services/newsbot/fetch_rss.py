"""Fetch RSS entries into normalized dicts. RSS-only (no HTML scrape)."""

from __future__ import annotations

from html import unescape
from typing import Any
import re

import feedparser
import requests


UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk; news aggregation drafts)"


def _strip_html(raw: str) -> str:
    text = unescape(raw or "")
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _first_image(entry: Any) -> str:
    media = entry.get("media_content") or entry.get("media_thumbnail") or []
    if isinstance(media, list) and media:
        url = media[0].get("url") if isinstance(media[0], dict) else None
        if url:
            return url
    enclosures = entry.get("enclosures") or []
    for enc in enclosures:
        href = enc.get("href") or ""
        typ = enc.get("type") or ""
        if href and ("image" in typ or href.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return href
    summary = entry.get("summary") or ""
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', summary, re.I)
    return m.group(1) if m else ""


def fetch_rss(url: str, limit: int = 8) -> list[dict[str, Any]]:
    resp = requests.get(url, timeout=25, headers={"User-Agent": UA})
    resp.raise_for_status()
    parsed = feedparser.parse(resp.content)
    items: list[dict[str, Any]] = []
    for entry in (parsed.entries or [])[:limit]:
        title = _strip_html(entry.get("title") or "")
        link = (entry.get("link") or "").strip()
        summary = _strip_html(entry.get("summary") or entry.get("description") or "")
        content = ""
        if entry.get("content"):
            try:
                content = _strip_html(entry.content[0].value)
            except Exception:
                content = ""
        body = content or summary or title
        if not title:
            continue
        items.append(
            {
                "title": title,
                "sourceUrl": link,
                "excerpt": summary[:400] if summary else title,
                "body": body[:4000],
                "coverImage": _first_image(entry),
            }
        )
    return items
