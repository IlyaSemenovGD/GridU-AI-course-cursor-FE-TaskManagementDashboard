"""Discount and checkout totals."""

from __future__ import annotations

from app.models.discount import DiscountCode


def compute_discount_cents(subtotal_cents: int, dc: DiscountCode) -> int:
    """Return discount amount in cents (never exceeds subtotal)."""
    if subtotal_cents <= 0:
        return 0
    if dc.percent_off is not None:
        return min(subtotal_cents, (subtotal_cents * dc.percent_off) // 100)
    if dc.amount_off_cents is not None:
        return min(subtotal_cents, dc.amount_off_cents)
    return 0


def validate_discount_for_subtotal(dc: DiscountCode, subtotal_cents: int) -> str | None:
    """Return error message if code cannot be applied, else None."""
    if not dc.active:
        return "This promotion is no longer active."
    if dc.max_uses is not None and dc.uses_count >= dc.max_uses:
        return "This promotion has reached its usage limit."
    if subtotal_cents < dc.min_order_cents:
        return (
            f"Minimum order of ${dc.min_order_cents / 100:.2f} required "
            "for this code."
        )
    if dc.percent_off is None and dc.amount_off_cents is None:
        return "Invalid discount configuration."
    return None
