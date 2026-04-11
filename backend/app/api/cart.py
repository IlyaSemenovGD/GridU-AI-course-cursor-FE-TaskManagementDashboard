"""Shopping cart: add/remove lines, apply discount codes."""

from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.cart import CartItem, CartSession
from app.models.discount import DiscountCode
from app.models.product import Product
from app.services.cart_service import cart_payload, get_cart_snapshot
from app.services.ecommerce_pricing import validate_discount_for_subtotal
from app.services.ticket_access import get_user_or_404

bp = Blueprint("cart", __name__)


@bp.get("")
@jwt_required()
def get_cart():
    uid = int(get_jwt_identity())
    if get_user_or_404(uid) is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    return cart_payload(*get_cart_snapshot(uid)), 200


@bp.post("/items")
@jwt_required()
def add_or_update_item():
    uid = int(get_jwt_identity())
    if get_user_or_404(uid) is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    pid = body.get("product_id")
    qty = body.get("quantity")
    if not isinstance(pid, int) and not (isinstance(pid, str) and str(pid).isdigit()):
        return {"status": "error", "code": "VALIDATION_ERROR", "message": "product_id required"}, 400
    pid = int(pid)
    if not isinstance(qty, int) or qty < 1:
        return {"status": "error", "code": "VALIDATION_ERROR", "message": "quantity must be >= 1"}, 400
    p = db.session.get(Product, pid)
    if p is None:
        return {"status": "error", "message": "Product not found", "code": "NOT_FOUND"}, 404
    existing = CartItem.query.filter_by(user_id=uid, product_id=pid).first()
    new_qty = qty if existing is None else existing.quantity + qty
    if new_qty > p.stock_quantity:
        return (
            {
                "status": "error",
                "code": "INSUFFICIENT_STOCK",
                "message": f"Only {p.stock_quantity} available in stock.",
            },
            400,
        )
    if existing:
        existing.quantity = new_qty
    else:
        db.session.add(CartItem(user_id=uid, product_id=pid, quantity=new_qty))
    db.session.commit()
    return cart_payload(*get_cart_snapshot(uid)), 200


@bp.put("/items/<int:product_id>")
@jwt_required()
def set_item_quantity(product_id: int):
    uid = int(get_jwt_identity())
    if get_user_or_404(uid) is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    qty = body.get("quantity")
    if not isinstance(qty, int) or qty < 0:
        return {"status": "error", "code": "VALIDATION_ERROR", "message": "quantity required"}, 400
    p = db.session.get(Product, product_id)
    if p is None:
        return {"status": "error", "message": "Product not found", "code": "NOT_FOUND"}, 404
    row = CartItem.query.filter_by(user_id=uid, product_id=product_id).first()
    if qty == 0:
        if row:
            db.session.delete(row)
            db.session.commit()
    else:
        if qty > p.stock_quantity:
            return (
                {
                    "status": "error",
                    "code": "INSUFFICIENT_STOCK",
                    "message": f"Only {p.stock_quantity} available in stock.",
                },
                400,
            )
        if row:
            row.quantity = qty
        else:
            db.session.add(CartItem(user_id=uid, product_id=product_id, quantity=qty))
        db.session.commit()
    return cart_payload(*get_cart_snapshot(uid)), 200


@bp.delete("/items/<int:product_id>")
@jwt_required()
def remove_item(product_id: int):
    uid = int(get_jwt_identity())
    if get_user_or_404(uid) is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    row = CartItem.query.filter_by(user_id=uid, product_id=product_id).first()
    if row:
        db.session.delete(row)
        db.session.commit()
    return cart_payload(*get_cart_snapshot(uid)), 200


@bp.post("/discount")
@jwt_required()
def apply_discount():
    uid = int(get_jwt_identity())
    if get_user_or_404(uid) is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    raw = (body.get("code") or "").strip().upper()
    if not raw:
        return {"status": "error", "code": "VALIDATION_ERROR", "message": "code is required"}, 400
    dc = DiscountCode.query.filter(func.upper(DiscountCode.code) == raw).first()
    if dc is None:
        return {"status": "error", "message": "Unknown discount code", "code": "INVALID_CODE"}, 404
    rows = CartItem.query.filter_by(user_id=uid).all()
    subtotal = 0
    for ci in rows:
        if ci.product:
            subtotal += ci.product.price_cents * ci.quantity
    err = validate_discount_for_subtotal(dc, subtotal)
    if err:
        return {"status": "error", "message": err, "code": "INVALID_CODE"}, 400
    sess = db.session.get(CartSession, uid)
    if sess is None:
        sess = CartSession(user_id=uid)
        db.session.add(sess)
    sess.discount_code_id = dc.id
    db.session.commit()
    return cart_payload(*get_cart_snapshot(uid)), 200


@bp.delete("/discount")
@jwt_required()
def clear_discount():
    uid = int(get_jwt_identity())
    if get_user_or_404(uid) is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    sess = db.session.get(CartSession, uid)
    if sess is not None:
        sess.discount_code_id = None
        db.session.commit()
    return cart_payload(*get_cart_snapshot(uid)), 200
