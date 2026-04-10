"""User serialization schemas."""

from marshmallow import Schema, fields

from app.extensions import db, ma
from app.models.user import User


class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User
        load_instance = True
        sqla_session = db.session

    id = ma.auto_field(dump_only=True)
    username = fields.String(required=True)
    full_name = fields.String(required=True)
    email = fields.Email(required=True)
    created_at = ma.auto_field(dump_only=True)


class UserRegisterSchema(Schema):
    name = fields.String(required=True)
    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)


user_schema = UserSchema()
users_schema = UserSchema(many=True)
user_register_schema = UserRegisterSchema()
