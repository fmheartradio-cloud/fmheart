"""Detect meaningful Sinhala script in RSS titles (Unicode U+0D80–U+0DFF)."""

from __future__ import annotations

import re

_SINHALA = re.compile(r"[\u0d80-\u0dff]")
_LETTER = re.compile(r"\p{L}", re.UNICODE)


def has_sinhala_script(text: str) -> bool:
    trimmed = (text or "").strip()
    if not trimmed:
        return False

    sinhala_chars = len(_SINHALA.findall(trimmed))
    if sinhala_chars >= 3:
        return True

    letters = _LETTER.findall(trimmed)
    if not letters:
        return False

    sinhala_letters = sum(1 for ch in letters if _SINHALA.search(ch))
    return sinhala_letters >= 1 and sinhala_letters / len(letters) >= 0.5


def has_sinhala_news_text(title: str, excerpt: str | None = None) -> bool:
    if has_sinhala_script(title):
        return True
    combined = f"{title.strip()} {(excerpt or '').strip()}".strip()
    return combined != title.strip() and has_sinhala_script(combined)
