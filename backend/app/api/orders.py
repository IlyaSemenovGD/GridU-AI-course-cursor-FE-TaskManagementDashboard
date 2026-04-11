"""Orders: authenticated customers place orders; admins manage status."""

from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.order_schema import order_create_schema, order_status_schema
from app.services.ticket_access import get_user_or_404

bp = Blueprint("orders", __name__)


def _order_json(o: Order) -> dict:
    return {
        "id": o.id,
        "user_id": o.user_id,
        "status": o.status,
        "subtotal_cents": o.subtotal_cents,
        "discount_cents": o.discount_cents,
        "total_cents": o.total_cents,
        "payment_reference": o.payment_reference,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "items": [
            {
                "product_id": li.product_id,
                "quantity": li.quantity,
                "unit_price_cents": li.unit_price_cents,
            }
            for li in o.items
        ],
    }


def _restore_order_stock(order: Order) -> None:
    for line in order.items:
        p = db.session.get(Product, line.product_id)
        if p is not None:
            p.stock_quantity += line.quantity


@bp.post("")
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    actor = get_user_or_404(user_id)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    errs = order_create_schema.validate(body)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = order_create_schema.load(body)
    merged: dict[int, int] = {}
    for line in data["items"]:
        pid = line["product_id"]
        qty = line["quantity"]
        merged[pid] = merged.get(pid, 0) + qty

    total = 0
    lines_payload: list[tuple[int, int, int]] = []
    for pid, qty in merged.items():
        p = db.session.get(Product, pid)
        if p is None:
            return (
                {
                    "status": "error",
                    "message": f"Product {pid} not found",
                    "code": "NOT_FOUND",
                },
                404,
            )
        if p.stock_quantity < qty:
            return (
                {
                    "status": "error",
                    "message": f"Insufficient stock for product {pid}",
                    "code": "INSUFFICIENT_STOCK",
                },
                400,
            )
        unit = p.price_cents
        total += unit * qty
        lines_payload.append((pid, qty, unit))
        p.stock_quantity -= qty

    order = Order(
        user_id=user_id,
        status=OrderStatus.PENDING.value,
        subtotal_cents=total,
        discount_cents=0,
        total_cents=total,
    )
    db.session.add(order)
    db.session.flush()
    for pid, qty, unit in lines_payload:
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=pid,
                quantity=qty,
                unit_price_cents=unit,
            )
        )
    db.session.commit()
    db.session.refresh(order)
    return _order_json(order), 201


@bp.get("")
@jwt_required()
def list_orders():
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    if actor.role == UserRole.ADMIN.value:
        rows = Order.query.order_by(Order.id.desc()).all()
    else:
        rows = (
            Order.query.filter_by(user_id=uid).order_by(Order.id.desc()).all()
        )
    return {"orders": [_order_json(o) for o in rows]}, 200


@bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id: int):
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    o = db.session.get(Order, order_id)
    if o is None:
        return {"status": "error", "message": "Order not found", "code": "NOT_FOUND"}, 404
    if actor.role != UserRole.ADMIN.value and o.user_id != uid:
        return {"status": "error", "message": "Forbidden", "code": "FORBIDDEN"}, 403
    return _order_json(o), 200


@bp.put("/<int:order_id>")
@jwt_required()
def update_order_status(order_id: int):
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    if actor.role != UserRole.ADMIN.value:
        return {"status": "error", "message": "Forbidden", "code": "FORBIDDEN"}, 403
    o = db.session.get(Order, order_id)
    if o is None:
        return {"status": "error", "message": "Order not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    errs = order_status_schema.validate(body)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = order_status_schema.load(body)
    new_status = data["status"]
    old_status = o.status
    if new_status == old_status:
        return _order_json(o), 200
    if old_status == OrderStatus.CANCELLED.value:
        return (
            {
                "status": "error",
                "message": "Cannot change a cancelled order",
                "code": "INVALID_STATE",
            },
            400,
        )
    if new_status == OrderStatus.CANCELLED.value:
        _restore_order_stock(o)
    o.status = new_status
    db.session.commit()
    db.session.refresh(o)
    return _order_json(o), 200


@bp.delete("/<int:order_id>")
@jwt_required()
def delete_order(order_id: int):
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    o = db.session.get(Order, order_id)
    if o is None:
        return {"status": "error", "message": "Order not found", "code": "NOT_FOUND"}, 404
    is_admin = actor.role == UserRole.ADMIN.value
    if not is_admin and o.user_id != uid:
        return {"status": "error", "message": "Forbidden", "code": "FORBIDDEN"}, 403
    if not is_admin and o.status != OrderStatus.PENDING.value:
        return (
            {
                "status": "error",
                "message": "Only pending orders can be cancelled by the owner",
                "code": "INVALID_STATE",
            },
            400,
        )
    if o.status != OrderStatus.CANCELLED.value:
        _restore_order_stock(o)
    db.session.delete(o)
    db.session.commit()
    return "", 204
