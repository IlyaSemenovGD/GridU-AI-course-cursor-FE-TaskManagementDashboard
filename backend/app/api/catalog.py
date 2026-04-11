"""Product catalog (read open; writes admin-only)."""

from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db, limiter
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.catalog_schema import product_create_schema, product_update_schema
from app.services.ticket_access import get_user_or_404

bp = Blueprint("catalog", __name__)


def _product_json(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "description": p.description,
        "price_cents": p.price_cents,
        "stock_quantity": p.stock_quantity,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _require_admin() -> tuple[User | None, tuple | None]:
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None:
        return None, ({"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404)
    if actor.role != UserRole.ADMIN.value:
        return None, ({"status": "error", "message": "Forbidden", "code": "FORBIDDEN"}, 403)
    return actor, None


@bp.get("/products")
def list_products():
    rows = Product.query.order_by(Product.id.asc()).all()
    return {"products": [_product_json(p) for p in rows]}, 200


@bp.get("/products/<int:product_id>")
def get_product(product_id: int):
    p = db.session.get(Product, product_id)
    if p is None:
        return {"status": "error", "message": "Product not found", "code": "NOT_FOUND"}, 404
    return _product_json(p), 200


@bp.post("/products")
@jwt_required()
@limiter.limit("200 per minute")
def create_product():
    _, err = _require_admin()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    errs = product_create_schema.validate(body)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = product_create_schema.load(body)
    sku_key = data["sku"].strip()
    if Product.query.filter(func.lower(Product.sku) == sku_key.lower()).first():
        return {"status": "error", "message": "SKU already exists", "code": "CONFLICT"}, 409
    p = Product(
        sku=sku_key,
        name=data["name"].strip(),
        description=(data.get("description") or "").strip() or None,
        price_cents=data["price_cents"],
        stock_quantity=data.get("stock_quantity", 0),
    )
    db.session.add(p)
    db.session.commit()
    return _product_json(p), 201


@bp.put("/products/<int:product_id>")
@jwt_required()
def update_product(product_id: int):
    actor, err = _require_admin()
    if err:
        return err
    p = db.session.get(Product, product_id)
    if p is None:
        return {"status": "error", "message": "Product not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    errs = product_update_schema.validate(body, partial=True)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = product_update_schema.load(body, partial=True)
    if not data:
        return (
            {
                "status": "error",
                "message": "Provide at least one field to update.",
                "code": "VALIDATION_ERROR",
            },
            400,
        )
    if "name" in data and data["name"] is not None:
        p.name = data["name"].strip()
    if "description" in data:
        p.description = (
            (data["description"] or "").strip() or None if data["description"] is not None else None
        )
    if "price_cents" in data and data["price_cents"] is not None:
        p.price_cents = data["price_cents"]
    if "stock_quantity" in data and data["stock_quantity"] is not None:
        p.stock_quantity = data["stock_quantity"]
    db.session.commit()
    return _product_json(p), 200


@bp.delete("/products/<int:product_id>")
@jwt_required()
def delete_product(product_id: int):
    actor, err = _require_admin()
    if err:
        return err
    p = db.session.get(Product, product_id)
    if p is None:
        return {"status": "error", "message": "Product not found", "code": "NOT_FOUND"}, 404
    db.session.delete(p)
    db.session.commit()
    return "", 204
