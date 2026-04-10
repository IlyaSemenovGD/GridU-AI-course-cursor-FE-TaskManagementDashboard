"""Unique username allocation from email local part."""

import re

from app.extensions import db
from app.models.user import User


def allocate_username_from_email(email: str) -> str:
    local = email.split("@", 1)[0]
    base = re.sub(r"[^a-zA-Z0-9_]", "_", local).strip("_") or "user"
    base = base[:40]
    candidate = base
    n = 0
    while User.query.filter_by(username=candidate).first() is not None:
        n += 1
        suffix = f"_{n}"
        candidate = (base[: 80 - len(suffix)] + suffix)[:80]
    return candidate
