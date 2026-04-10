"""Outbound email (stub: log in development; extend with SMTP/SendGrid in production)."""

from __future__ import annotations

import logging
from typing import Any

from flask import current_app

logger = logging.getLogger(__name__)


def send_email(
    to: str,
    subject: str,
    body: str,
    *,
    meta: dict[str, Any] | None = None,
) -> None:
    """Queue or send an email. Stub implementation logs only."""
    extra = f" meta={meta}" if meta else ""
    msg = f"[email stub] to={to} subject={subject!r}{extra}"
    logger.info("%s", msg)
    if current_app and current_app.debug:
        current_app.logger.debug("%s\n%s", msg, body[:2000])
