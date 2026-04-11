"""Product catalog request/response schemas."""

from marshmallow import Schema, fields, validate


class ProductCreateSchema(Schema):
    sku = fields.String(required=True, validate=validate.Length(min=1, max=64))
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(load_default=None, allow_none=True)
    price_cents = fields.Integer(required=True, validate=validate.Range(min=1))
    stock_quantity = fields.Integer(
        load_default=0, validate=validate.Range(min=0, max=10_000_000)
    )


class ProductUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=200), load_default=None)
    description = fields.String(load_default=None, allow_none=True)
    price_cents = fields.Integer(validate=validate.Range(min=1), load_default=None)
    stock_quantity = fields.Integer(
        validate=validate.Range(min=0, max=10_000_000), load_default=None
    )


product_create_schema = ProductCreateSchema()
product_update_schema = ProductUpdateSchema()
