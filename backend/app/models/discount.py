"""Promotional discount codes for checkout."""

from __future__ import annotations

from datetime import datetime, timezone

from app.extensions import db


class DiscountCode(db.Model):
    __tablename__ = "discount_codes"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    percent_off = db.Column(db.Integer, nullable=True)  # 1–100
    amount_off_cents = db.Column(db.Integer, nullable=True)
    min_order_cents = db.Column(db.Integer, nullable=False, default=0)
    active = db.Column(db.Boolean, nullable=False, default=True)
    max_uses = db.Column(db.Integer, nullable=True)
    uses_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
