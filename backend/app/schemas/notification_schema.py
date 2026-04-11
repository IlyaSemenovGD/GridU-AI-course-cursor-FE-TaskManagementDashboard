"""Notification serialization."""

from marshmallow import fields

from app.extensions import db, ma
from app.models.notification import Notification


class NotificationSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Notification
        load_instance = True
        sqla_session = db.session

    id = ma.auto_field(dump_only=True)
    user_id = ma.auto_field(dump_only=True)
    type = fields.String(required=True)
    title = fields.String(required=True)
    body = fields.String(load_default="")
    entity_type = fields.String(allow_none=True)
    entity_id = fields.String(allow_none=True)
    read_at = ma.auto_field(allow_none=True)
    created_at = ma.auto_field(dump_only=True)


notification_schema = NotificationSchema()
notifications_schema = NotificationSchema(many=True)
