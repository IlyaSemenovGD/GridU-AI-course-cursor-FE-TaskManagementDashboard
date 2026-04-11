"""Per-user shopping cart and applied discount."""

from __future__ import annotations

from app.extensions import db


class CartSession(db.Model):
    """One row per user: optional applied discount code."""

    __tablename__ = "cart_sessions"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    discount_code_id = db.Column(db.Integer, db.ForeignKey("discount_codes.id"), nullable=True)


class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
    )

    product = db.relationship("Product")
