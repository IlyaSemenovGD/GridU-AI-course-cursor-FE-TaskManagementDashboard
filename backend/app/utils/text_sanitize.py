"""Sanitize user-generated text (XSS mitigation)."""

import bleach
import html


def sanitize_plain(text: str, *, max_length: int | None = None) -> str:
    """Strip HTML; allow plain text only. Optionally truncate."""
    if text is None:
        return ""
    cleaned = bleach.clean(text, tags=[], strip=True)
    cleaned = html.unescape(cleaned).strip()
    if max_length is not None and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned
