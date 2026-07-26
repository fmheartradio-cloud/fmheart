"""Infer FM Heart news categories from RSS metadata and article text."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse, unquote

FM_HEART_NEWS_CATEGORIES = [
    "දේශීය",
    "දේශපාලන",
    "ව්‍යාපාර",
    "ක්‍රීඩා",
    "තාක්ෂණය",
    "සෞඛ්‍ය",
    "ජීවන රටාව",
    "ලෝක පුවත්",
    "විදේශීය",
    "ජාත්‍යන්තර",
]

URL_SEGMENT_TO_CATEGORY = {
    "sports": "ක්‍රීඩා",
    "sport": "ක්‍රීඩා",
    "cricket": "ක්‍රීඩා",
    "football": "ක්‍රීඩා",
    "international": "ලෝක පුවත්",
    "world": "ලෝක පුවත්",
    "global": "ලෝක පුවත්",
    "foreign": "ලෝක පුවත්",
    "political": "දේශපාලන",
    "politics": "දේශපාලන",
    "business": "ව්‍යාපාර",
    "finance": "ව්‍යාපාර",
    "economy": "ව්‍යාපාර",
    "entertainment": "ජීවන රටාව",
    "lifestyle": "ජීවන රටාව",
    "travel": "ජීවන රටාව",
    "gossip": "ජීවන රටාව",
    "tech": "තාක්ෂණය",
    "technology": "තාක්ෂණය",
    "health": "සෞඛ්‍ය",
    "medical": "සෞඛ්‍ය",
}

RSS_TAG_TO_CATEGORY = {
    **URL_SEGMENT_TO_CATEGORY,
    "local": "දේශීය",
    "latest": "දේශීය",
}

KEYWORD_RULES: list[tuple[str, list[re.Pattern[str]]]] = [
    (
        "ක්‍රීඩා",
        [
            re.compile(
                r"\b(?:cricket|football|soccer|rugby|tennis|basketball|olympic|athletics|badminton|volleyball|hockey|golf|f1|formula\s*one)\b",
                re.I,
            ),
            re.compile(
                r"(?:ක්‍රිකට්|පාපන්දු|රග්බි|ටෙනිස්|පිහිනුම|වොලිබෝල්|ක්‍රීඩ|තරග|ලෝක\s*කුසලාන|world\s*cup|t20|odi|test\s*match|premier\s*league|champions\s*league|ipl|nba|fifa|uefa|wimbledon|ashes)",
                re.I,
            ),
        ],
    ),
    (
        "දේශපාලන",
        [
            re.compile(
                r"\b(?:parliament|cabinet|election|referendum|president|prime\s*minister|minister|mp\b|senate|congress|politic)\b",
                re.I,
            ),
            re.compile(
                r"(?:පාර්ලි|ජනාධිපති|අග(?:මැති|මංත්‍රී)|මන්ත්‍රී|ඇමති|ඡන්ද|මැතිවරණ|දේශපාලන|ආණ්ඩු|විපක්ෂ|රජය|ජනතා\s*පක්ෂ)",
                re.I,
            ),
        ],
    ),
    (
        "ව්‍යාපාර",
        [
            re.compile(
                r"\b(?:business|economy|economic|stock|shares|market|trade|gdp|inflation|bank|corporate|company|startup|investment|export|import|tax|budget|finance)\b",
                re.I,
            ),
            re.compile(
                r"(?:ව්‍යාපාර|ආර්ථික|කොටස්|බැංකු|සංස්ථා|ආයෝජ|බදු|අයවැය|වෙළඳ|නිෂ්පාද|රැකියා\s*අවස්ථ)",
                re.I,
            ),
        ],
    ),
    (
        "තාක්ෂණය",
        [
            re.compile(
                r"\b(?:technology|tech|software|hardware|computer|smartphone|mobile|internet|cyber|digital|ai\b|artificial\s*intelligence|robot|blockchain|crypto|app\b)\b",
                re.I,
            ),
            re.compile(
                r"(?:තාක්ෂණ|ඩිජිටල|අන්තර්ජාල|සයිබර්|පරිගණක|මොබයිල|සොෆ්ට්|හැකිළ|AI|කෘතිම\s*බුද්ධ)",
                re.I,
            ),
        ],
    ),
    (
        "සෞඛ්‍ය",
        [
            re.compile(
                r"\b(?:health|hospital|doctor|medical|disease|virus|covid|vaccine|who\b|cancer|surgery|patient|pharma|medicine)\b",
                re.I,
            ),
            re.compile(r"(?:සෞඛ්‍ය|රෝහල|වෛද්‍ය|රෝග|සැත්කම|ඖෂධ|වෛරස)", re.I),
        ],
    ),
    (
        "ජීවන රටාව",
        [
            re.compile(
                r"\b(?:entertainment|film|movie|cinema|music|concert|celebrity|fashion|model|beauty|pageant|drama|tele\s*drama|tiktok|travel|festival|wedding)\b",
                re.I,
            ),
            re.compile(
                r"(?:මොඩල|සිනම|චිත්‍ර|නාට්‍ය|සංගීත|ගීත|තරු|නිළි|නිළිය|උත්සව|සංචාර|රූප\s*ලාව)",
                re.I,
            ),
        ],
    ),
    (
        "ලෝක පුවත්",
        [
            re.compile(
                r"\b(?:international|global|foreign|worldwide|united\s*nations|nato|eu\b|european\s*union|america|usa|uk\b|china|japan|russia|iran|israel|palestine|ukraine|syria|iraq|afghanistan|france|germany|italy|spain|australia|canada|india|pakistan|bangladesh|saudi|yemen|lebanon|turkey|korea|taiwan|myanmar|nepal|maldives)\b",
                re.I,
            ),
            re.compile(
                r"(?:ජාත්‍යන්තර|විදේශ|ලෝක\s*පු|ඇමරික|චීන|ජප(?:ා|)න|රුස(?:ි|)ය|ඉර(?:ා|)න|ඊශ්‍රා(?:ය|)ල|පල(?:ස්|)ත(?:ී|)න|යුක්(?:්|)ර(?:ේ|)න|ස්ප(?:ා|)ඤ|ඇ(?:ෆ|)ග(?:ා|)න(?:ි|)ස්(?:්|)ත(?:ා|)න|ස(?:ි|)ර(?:ි|)ය|ඉ(?:්|)ර(?:ා|)ක)",
                re.I,
            ),
        ],
    ),
]


def _normalize_text(*parts: str | None) -> str:
    return re.sub(r"\s+", " ", " ".join(p.strip() for p in parts if p and p.strip())).strip()


def _category_from_url(source_url: str) -> str | None:
    if not source_url:
        return None
    try:
        segments = [
            unquote(part).strip().lower()
            for part in urlparse(source_url).path.split("/")
            if part.strip()
        ]
    except Exception:
        return None
    for segment in segments:
        if segment in {"uncategorized", "news"} or segment.isdigit():
            continue
        mapped = URL_SEGMENT_TO_CATEGORY.get(segment)
        if mapped:
            return mapped
    return None


def _category_from_rss_tags(tags: list[str] | None) -> str | None:
    for raw in tags or []:
        key = raw.strip().lower()
        if not key or key == "latest":
            continue
        mapped = RSS_TAG_TO_CATEGORY.get(key)
        if mapped and mapped != "දේශීය":
            return mapped
    return None


def _category_from_keywords(text: str) -> str | None:
    for category, patterns in KEYWORD_RULES:
        for pattern in patterns:
            if pattern.search(text):
                return category
    return None


def infer_news_category(
    *,
    source_id: str,
    source_default_category: str,
    source_url: str = "",
    title: str,
    excerpt: str = "",
    rss_categories: list[str] | None = None,
) -> str:
    if source_id == "bbc-sinhala":
        return "ජාත්‍යන්තර"

    text = _normalize_text(title, excerpt)
    from_url = _category_from_url(source_url)
    if from_url:
        return from_url

    from_rss = _category_from_rss_tags(rss_categories)
    if from_rss:
        return from_rss

    from_keywords = _category_from_keywords(text)
    if from_keywords:
        return from_keywords

    return source_default_category or "දේශීය"


def should_upgrade_ingested_category(
    existing_category: str,
    source_default_category: str,
    inferred_category: str,
) -> bool:
    existing = (existing_category or "").strip()
    source_default = (source_default_category or "").strip()
    inferred = (inferred_category or "").strip()
    if not existing or not inferred or existing == inferred:
        return False
    return existing == source_default


def merge_ingest_tags(
    existing_tags: Any,
    source_name: str,
    source_default_category: str,
    category: str,
) -> list[str]:
    base = (
        [str(tag).strip() for tag in existing_tags if str(tag).strip()]
        if isinstance(existing_tags, list)
        else [source_name, source_default_category]
    )
    next_tags = [
        category if tag == source_default_category else tag for tag in base
    ]
    if source_name not in next_tags:
        next_tags.insert(0, source_name)
    if category not in next_tags:
        next_tags.append(category)
    return next_tags
