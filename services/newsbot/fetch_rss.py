"""Fetch RSS entries into normalized dicts with cover image resolution."""

from __future__ import annotations

from html import unescape
from typing import Any
from urllib.parse import urljoin, urlparse
import re

import feedparser
import requests


UA = "FMHeartNewsBot/1.0 (+https://fmheart.lk; news aggregation drafts)"
_IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")
MIN_BODY_CHARS = 280
MAX_BODY_CHARS = 10000
ADMIN_BODY_MIN_CHARS = 500


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


def _normalize_body_text(raw: str) -> str:
    return re.sub(r"\s+", " ", (raw or "").strip())


def _jaccard(a: str, b: str) -> float:
    a_set = set(a.split())
    b_set = set(b.split())
    if not a_set or not b_set:
        return 0.0
    inter = len(a_set & b_set)
    return inter / (len(a_set) + len(b_set) - inter)


def is_body_too_short(body: str, title: str) -> bool:
    text = _normalize_body_text(body)
    if len(text) < MIN_BODY_CHARS:
        return True
    title_norm = _normalize_body_text(title).lower()
    body_norm = text.lower()
    if body_norm == title_norm:
        return True
    if (
        len(title_norm) > 20
        and body_norm.startswith(title_norm)
        and len(text) < len(title_norm) + 80
    ):
        return True
    return _jaccard(body_norm, title_norm) >= 0.88


def cap_body(text: str) -> str:
    trimmed = (text or "").strip()
    if len(trimmed) <= MAX_BODY_CHARS:
        return trimmed
    slice_ = trimmed[:MAX_BODY_CHARS]
    last_break = slice_.rfind("\n\n")
    if last_break > MAX_BODY_CHARS * 0.6:
        return slice_[:last_break].strip()
    return slice_.strip()


def _strip_inline_html(raw: str) -> str:
    text = unescape(raw or "")
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p>", "\n", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = text.replace("\u200c", " ").replace("\u200d", " ").replace("\xa0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _html_fragment_to_paragraphs(fragment: str) -> str:
    html = fragment or ""
    html = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", html)
    html = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", html)
    html = re.sub(r"(?is)<noscript[^>]*>.*?</noscript>", " ", html)
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    paragraphs: list[str] = []
    for match in re.finditer(r"(?is)<p[^>]*>(.*?)</p>", html):
        text = _strip_inline_html(match.group(1))
        if len(text) >= 20 and not text.startswith("Reply To:"):
            paragraphs.append(text)
    if paragraphs:
        return "\n\n".join(paragraphs)
    return _strip_inline_html(html)


def _extract_meta_description(html: str) -> str:
    if not html:
        return ""

    patterns = [
        r'property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']',
        r'content=["\']([^"\']+)["\'][^>]*property=["\']og:description["\']',
        r'name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
        r'content=["\']([^"\']+)["\'][^>]*name=["\']description["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I)
        if match:
            return _strip_inline_html(match.group(1))
    return ""


def _article_fetch_url(source_url: str) -> str:
    try:
        parsed = urlparse(source_url.strip())
        host = (parsed.netloc or "").lower()
        path = parsed.path or ""
        if (
            ("bbc.com" in host or "bbc.co.uk" in host)
            and "/articles/" in path
            and not path.endswith(".lite")
        ):
            path = path.rstrip("/") + ".lite"
            return parsed._replace(path=path).geturl()
    except Exception:
        pass
    return source_url.strip()


def extract_article_body_from_html(html: str, page_url: str) -> str:
    host = (urlparse(page_url).netloc or "").lower()

    if "ada.lk" in host:
        wrap = re.search(
            r'<div[^>]+class=["\'][^"\']*\bsingle-body-wrap\b[^"\']*["\'][^>]*>(.*?)</div>\s*<div[^>]+class=["\'][^"\']*social-media',
            html,
            re.I | re.S,
        )
        if not wrap:
            wrap = re.search(
                r'<div[^>]+class=["\'][^"\']*\bsingle-body-wrap\b[^"\']*["\'][^>]*>(.*?)</div>',
                html,
                re.I | re.S,
            )
        if wrap:
            text = _html_fragment_to_paragraphs(wrap.group(1))
            if len(text) >= MIN_BODY_CHARS:
                return cap_body(text)

    if "adaderana.lk" in host:
        for match in re.finditer(
            r'<div[^>]+class=["\'][^"\']*\bprose\b[^"\']*["\'][^>]*>(.*?)</div>',
            html,
            re.I | re.S,
        ):
            text = _html_fragment_to_paragraphs(match.group(1))
            if len(text) >= MIN_BODY_CHARS:
                return cap_body(text)

    if "bbc.com" in host or "bbc.co.uk" in host:
        paragraphs = []
        for match in re.finditer(r"(?is)<p[^>]*>(.*?)</p>", html):
            text = _strip_inline_html(match.group(1))
            if len(text) >= 40 and not re.search(
                r"BBC News|අවම ඩේටා|cookie|subscribe|privacy policy", text, re.I
            ):
                paragraphs.append(text)
        joined = "\n\n".join(paragraphs)
        if len(joined) >= MIN_BODY_CHARS:
            return cap_body(joined)

    generic_patterns = [
        r"(?is)<article[^>]*>(.*?)</article>",
        r'<div[^>]+itemprop=["\']articleBody["\'][^>]*>(.*?)</div>',
        r'<div[^>]+class=["\'][^"\']*\bentry-content\b[^"\']*["\'][^>]*>(.*?)</div>',
        r'<div[^>]+class=["\'][^"\']*\barticle-content\b[^"\']*["\'][^>]*>(.*?)</div>',
        r'<div[^>]+id=["\']text-contents["\'][^>]*>(.*?)</div>',
    ]
    for pattern in generic_patterns:
        block = re.search(pattern, html, re.I | re.S)
        if not block:
            continue
        text = _html_fragment_to_paragraphs(block.group(1))
        if len(text) >= MIN_BODY_CHARS:
            return cap_body(text)

    meta = _extract_meta_description(html)
    if len(meta) >= 80:
        return cap_body(meta)
    return ""


def _fetch_page_html(source_url: str) -> tuple[str, str]:
    page_url = _article_fetch_url(source_url)
    if not page_url:
        return "", ""
    try:
        parsed = urlparse(page_url)
        referer = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else ""
    except Exception:
        referer = ""
    headers = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
    if referer:
        headers["Referer"] = referer
    try:
        resp = requests.get(page_url, timeout=18, headers=headers)
        resp.raise_for_status()
        return resp.text, page_url
    except Exception:
        return "", page_url


def fetch_article_page_data(source_url: str) -> dict[str, str]:
    html, page_url = _fetch_page_html(source_url)
    if not html:
        return {"coverImage": "", "body": ""}
    return {
        "coverImage": _extract_cover_from_html(html, page_url or source_url),
        "body": extract_article_body_from_html(html, page_url or source_url),
    }


def _extract_cover_from_html(html: str, source_url: str) -> str:
    if not html:
        return ""

    patterns = [
        r'property=["\']og:image(?::url)?["\'][^>]*content=["\']([^"\']+)["\']',
        r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image(?::url)?["\']',
        r'name=["\']twitter:image(?::src)?["\'][^>]*content=["\']([^"\']+)["\']',
        r'content=["\']([^"\']+)["\'][^>]*name=["\']twitter:image(?::src)?["\']',
        r'itemprop=["\']image["\'][^>]*content=["\']([^"\']+)["\']',
        r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I)
        if match:
            url = _absolutize(unescape(match.group(1)), source_url)
            if url.startswith("http://"):
                url = "https://" + url[len("http://") :]
            return url

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


def fetch_og_image(source_url: str) -> str:
    return fetch_article_page_data(source_url).get("coverImage") or ""


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
        rss_categories = [
            str(tag.get("term") or tag.get("label") or "").strip()
            for tag in (entry.get("tags") or [])
            if str(tag.get("term") or tag.get("label") or "").strip()
        ]
        page_data: dict[str, str] | None = None
        if link and (not cover or is_body_too_short(body, title)):
            page_data = fetch_article_page_data(link)
            if not cover:
                cover = page_data.get("coverImage") or ""
            if is_body_too_short(body, title):
                page_body = page_data.get("body") or ""
                if page_body and not is_body_too_short(page_body, title):
                    body = page_body
        items.append(
            {
                "title": title,
                "sourceUrl": link,
                "excerpt": summary[:400] if summary else title,
                "body": cap_body(body)[:MAX_BODY_CHARS],
                "coverImage": cover,
                "rssCategories": rss_categories,
            }
        )
    return items
