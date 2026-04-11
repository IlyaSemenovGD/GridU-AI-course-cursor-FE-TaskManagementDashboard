"""PRD-aligned validation for support tickets (subject charset, RFC 5322 email)."""

from __future__ import annotations

import re

from email_validator import EmailNotValidError, validate_email
from marshmallow import ValidationError

# PRD: alphanumeric and common punctuation only (ASCII letters, digits, space, listed punctuation).
SUBJECT_ALLOWED = re.compile(
    r"^[a-zA-Z0-9\s.,!?\-_\'\":;()\[\]&@#+/]+$",
    re.ASCII,
)


def validate_subject_prd(value: str) -> None:
    if not SUBJECT_ALLOWED.fullmatch(value):
        raise ValidationError(
            "Subject may only contain letters, numbers, spaces, and common punctuation "
            "(.,!?-_\\'\\\";:()[]&@#+/)."
        )


def normalize_email_rfc5322(value: str) -> str:
    """Validate and normalize email (email-validator; no DNS deliverability check)."""
    try:
        return validate_email(value.strip(), check_deliverability=False).normalized
    except EmailNotValidError as e:
        msg = getattr(e, "reason", None) or str(e)
        raise ValidationError(msg) from e
