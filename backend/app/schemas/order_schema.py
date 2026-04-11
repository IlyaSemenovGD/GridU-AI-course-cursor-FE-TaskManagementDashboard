"""Order request/response schemas."""

from marshmallow import Schema, fields, validate


class OrderItemLineSchema(Schema):
    product_id = fields.Integer(required=True, validate=validate.Range(min=1))
    quantity = fields.Integer(required=True, validate=validate.Range(min=1, max=10_000))


class OrderCreateSchema(Schema):
    items = fields.List(
        fields.Nested(OrderItemLineSchema), required=True, validate=validate.Length(min=1)
    )


class OrderStatusUpdateSchema(Schema):
    status = fields.String(
        required=True,
        validate=validate.OneOf(["pending", "confirmed", "cancelled"]),
    )


order_create_schema = OrderCreateSchema()
order_status_schema = OrderStatusUpdateSchema()
