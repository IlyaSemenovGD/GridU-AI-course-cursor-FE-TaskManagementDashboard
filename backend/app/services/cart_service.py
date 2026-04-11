"""Cart totals and serialization (shared by cart + checkout routes)."""

from __future__ import annotations

from app.extensions import db
from app.models.cart import CartItem, CartSession
from app.models.discount import DiscountCode
from app.services.ecommerce_pricing import (
    compute_discount_cents,
    validate_discount_for_subtotal,
)


def line_json(ci: CartItem) -> dict:
    p = ci.product
    if p is None:
        return {}
    line_sub = p.price_cents * ci.quantity
    return {
        "product_id": p.id,
        "sku": p.sku,
        "name": p.name,
        "quantity": ci.quantity,
        "unit_price_cents": p.price_cents,
        "line_subtotal_cents": line_sub,
    }


def get_cart_snapshot(user_id: int) -> tuple[list[dict], int, int, int, dict | None]:
    """Returns lines, subtotal, discount_cents, total_cents, discount_meta."""
    rows = (
        CartItem.query.filter_by(user_id=user_id)
        .order_by(CartItem.id.asc())
        .all()
    )
    lines: list[dict] = []
    subtotal = 0
    for ci in rows:
        j = line_json(ci)
        if not j:
            continue
        subtotal += j["line_subtotal_cents"]
        lines.append(j)

    sess = db.session.get(CartSession, user_id)
    discount_cents = 0
    discount_meta: dict | None = None
    if sess is not None and sess.discount_code_id is not None:
        dc = db.session.get(DiscountCode, sess.discount_code_id)
        if dc is None:
            sess.discount_code_id = None
            db.session.commit()
        else:
            err = validate_discount_for_subtotal(dc, subtotal)
            if err:
                sess.discount_code_id = None
                db.session.commit()
                discount_meta = {"cleared": True, "message": err}
            else:
                discount_cents = compute_discount_cents(subtotal, dc)
                discount_meta = {
                    "code": dc.code,
                    "discount_cents": discount_cents,
                    "percent_off": dc.percent_off,
                    "amount_off_cents": dc.amount_off_cents,
                }

    total = max(0, subtotal - discount_cents)
    return lines, subtotal, discount_cents, total, discount_meta


def cart_payload(
    lines: list[dict],
    subtotal: int,
    discount_cents: int,
    total: int,
    discount_meta: dict | None,
) -> dict:
    return {
        "items": lines,
        "subtotal_cents": subtotal,
        "discount_cents": discount_cents,
        "total_cents": total,
        "discount": discount_meta,
    }
