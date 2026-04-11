"""Checkout: mock payment, create order from cart, send confirmation email."""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.cart import CartItem, CartSession
from app.models.discount import DiscountCode
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.services.cart_service import get_cart_snapshot
from app.services.ticket_access import get_user_or_404
from app.tasks.background import send_order_confirmation_email

bp = Blueprint("checkout", __name__)


@bp.post("")
@jwt_required()
def checkout():
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404

    body = request.get_json(silent=True) or {}
    method = (body.get("payment_method") or "").strip().lower()
    card_last4 = (body.get("card_last4") or "").strip()
    cardholder = (body.get("cardholder_name") or "").strip()

    if method != "card":
        return (
            {
                "status": "error",
                "code": "VALIDATION_ERROR",
                "message": "payment_method must be 'card'",
            },
            400,
        )
    if len(card_last4) != 4 or not card_last4.isdigit():
        return (
            {
                "status": "error",
                "code": "VALIDATION_ERROR",
                "message": "card_last4 must be four digits",
            },
            400,
        )
    if len(cardholder) < 2:
        return (
            {
                "status": "error",
                "code": "VALIDATION_ERROR",
                "message": "cardholder_name is required",
            },
            400,
        )

    lines, subtotal, discount_cents, total, discount_meta = get_cart_snapshot(uid)
    if not lines:
        return (
            {
                "status": "error",
                "code": "EMPTY_CART",
                "message": "Your cart is empty.",
            },
            400,
        )

    # Re-validate stock from DB (cart snapshot uses current prices)
    merged: dict[int, int] = {}
    for line in lines:
        merged[line["product_id"]] = merged.get(line["product_id"], 0) + line["quantity"]

    for pid, qty in merged.items():
        p = db.session.get(Product, pid)
        if p is None:
            return {"status": "error", "message": f"Product {pid} not found", "code": "NOT_FOUND"}, 404
        if p.stock_quantity < qty:
            return (
                {
                    "status": "error",
                    "code": "INSUFFICIENT_STOCK",
                    "message": f"Insufficient stock for {p.name}",
                },
                400,
            )

    # Mock payment gateway
    if card_last4 == "0000":
        return (
            {
                "status": "error",
                "code": "PAYMENT_DECLINED",
                "message": "Card was declined. Try another card.",
            },
            402,
        )

    pay_ref = f"pay_mock_{uuid.uuid4().hex[:16]}"

    # Build order lines with current unit prices
    order_lines: list[tuple[int, int, int]] = []
    for line in lines:
        pid = line["product_id"]
        qty = line["quantity"]
        unit = line["unit_price_cents"]
        order_lines.append((pid, qty, unit))
        p = db.session.get(Product, pid)
        assert p is not None
        p.stock_quantity -= qty

    order = Order(
        user_id=uid,
        status=OrderStatus.CONFIRMED.value,
        subtotal_cents=subtotal,
        discount_cents=discount_cents,
        total_cents=total,
        payment_reference=pay_ref,
    )
    db.session.add(order)
    db.session.flush()
    for pid, qty, unit in order_lines:
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=pid,
                quantity=qty,
                unit_price_cents=unit,
            )
        )

    # Increment discount usage
    sess = db.session.get(CartSession, uid)
    if sess is not None and sess.discount_code_id is not None and discount_cents > 0:
        dc = db.session.get(DiscountCode, sess.discount_code_id)
        if dc is not None:
            dc.uses_count += 1

    # Clear cart
    CartItem.query.filter_by(user_id=uid).delete()
    if sess is not None:
        sess.discount_code_id = None
    db.session.commit()

    send_order_confirmation_email.delay(order.id)

    return {
        "status": "ok",
        "order": {
            "id": order.id,
            "subtotal_cents": subtotal,
            "discount_cents": discount_cents,
            "total_cents": total,
            "payment_reference": pay_ref,
            "confirmation_message": (
                f"Thank you, {cardholder.split()[0]}! "
                f"A confirmation email was sent to {actor.email}."
            ),
        },
        "discount_applied": discount_meta,
        "email_notification": "queued",
    }, 200
