"""Fetch RSS entries into normalized dicts with cover image resolution."""

from __future__ import annotations

from html import unescape
from typing import Any
from urllib.parse import urljoin
import re

import feedparser
import requests


UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk; news aggregation drafts)"
_IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")


def _strip_html(raw: str) -> str:
    text = unescape(raw or "")
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _is_image_url(url: str) -> bool:
    lower = (url or "").lower()
    if any(lower.endswith(ext) or f"{ext}?" in lower for ext in _IMAGE_EXT):
        return True
    return bool(re.search(r"[?&](format|fm|f)=?(jpg|jpeg|png|webp|gif)", lower, re.I))


def _absolutize(url: str, *bases: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        return f"https:{url}"
    if re.match(r"^https?://", url, re.I):
        return url
    for base in bases:
        if not base:
            continue
        try:
            return urljoin(base, url)
        except Exception:
            continue
    return url


def _image_from_html(html: str, item_link: str, feed_base: str) -> str:
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I):
        src = unescape(match.group(1))
        if not src or src.lower().startswith("data:"):
            continue
        abs_url = _absolutize(src, item_link, feed_base)
        if _is_image_url(abs_url):
            return abs_url
    return ""


def _first_image(entry: Any, feed_base: str = "") -> str:
    link = (entry.get("link") or "").strip()
    media = entry.get("media_content") or entry.get("media_thumbnail") or []
    if isinstance(media, list):
        for item in media:
            if not isinstance(item, dict):
                continue
            url = item.get("url") or ""
            typ = item.get("type") or ""
            if url and (typ.startswith("image/") or _is_image_url(url)):
                return _absolutize(url, link, feed_base)

    for enc in entry.get("enclosures") or []:
        href = enc.get("href") or enc.get("url") or ""
        typ = enc.get("type") or ""
        if href and ("image" in typ or _is_image_url(href)):
            return _absolutize(href, link, feed_base)

    for field in ("summary", "description", "content"):
        raw = ""
        if field == "content" and entry.get("content"):
            try:
                raw = entry.content[0].value
            except Exception:
                raw = ""
        else:
            raw = entry.get(field) or ""
        if raw:
            found = _image_from_html(unescape(raw), link, feed_base)
            if found:
                return found
    return ""


def _fetch_og_image(source_url: str) -> str:
    if not source_url:
        return ""
    try:
        resp = requests.get(
            source_url,
            timeout=12,
            headers={"User-Agent": UA, "Accept": "text/html,*/*"},
        )
        resp.raise_for_status()
        html = resp.text
    except Exception:
        return ""

    patterns = [
        r'property=["\']og:image(?::url)?["\'][^>]*content=["\']([^"\']+)["\']',
        r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image(?::url)?["\']',
        r'name=["\']twitter:image(?::src)?["\'][^>]*content=["\']([^"\']+)["\']',
        r'content=["\']([^"\']+)["\'][^>]*name=["\']twitter:image(?::src)?["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I)
        if match:
            return _absolutize(unescape(match.group(1)), source_url)

    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I):
        src = unescape(match.group(1))
        if not src or src.lower().startswith("data:"):
            continue
        lower = src.lower()
        if re.search(r"logo|icon|avatar|pixel|spacer|1x1|tracking|badge|sprite", lower):
            continue
        abs_url = _absolutize(src, source_url)
        if _is_image_url(abs_url):
            return abs_url
    return ""


def fetch_rss(url: str, limit: int = 8) -> list[dict[str, Any]]:
    resp = requests.get(url, timeout=25, headers={"User-Agent": UA})
    resp.raise_for_status()
    parsed = feedparser.parse(resp.content)
    feed_base = (parsed.feed.get("link") or url).strip()
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
        cover = _first_image(entry, feed_base)
        if not cover and link:
            cover = _fetch_og_image(link)
        items.append(
            {
                "title": title,
                "sourceUrl": link,
                "excerpt": summary[:400] if summary else title,
                "body": body[:4000],
                "coverImage": cover,
            }
        )
    return items
