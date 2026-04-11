"""Demo catalog and discount codes when tables are empty (dev/demo UX)."""

from __future__ import annotations

from app.extensions import db
from app.models.discount import DiscountCode
from app.models.product import Product


def seed_demo_catalog_if_empty() -> None:
    """Idempotent: add sample products + codes if none exist."""
    if Product.query.count() > 0:
        return
    samples = [
        Product(
            sku="DEMO-NOTEBOOK",
            name="TaskFlow Notebook",
            description="Lined notebook with TaskFlow branding.",
            price_cents=1299,
            stock_quantity=50,
        ),
        Product(
            sku="DEMO-MUG",
            name="Ceramic Mug",
            description="15oz mug — dishwasher safe.",
            price_cents=1899,
            stock_quantity=40,
        ),
        Product(
            sku="DEMO-STICKER",
            name="Sticker pack",
            description="Vinyl stickers for your laptop.",
            price_cents=499,
            stock_quantity=200,
        ),
    ]
    for p in samples:
        db.session.add(p)
    db.session.commit()


def seed_discount_codes_if_empty() -> None:
    if DiscountCode.query.count() > 0:
        return
    codes = [
        DiscountCode(
            code="SAVE10",
            percent_off=10,
            min_order_cents=0,
            active=True,
        ),
        DiscountCode(
            code="FLAT500",
            amount_off_cents=500,
            min_order_cents=2000,
            active=True,
        ),
    ]
    for c in codes:
        db.session.add(c)
    db.session.commit()
