"""Project and member serialization."""

from marshmallow import Schema, fields, validate

from app.extensions import db, ma
from app.models.project import Project


class ProjectSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Project
        load_instance = True
        sqla_session = db.session

    id = ma.auto_field(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(load_default="")
    owner_id = ma.auto_field(dump_only=True)
    archived = fields.Boolean(load_default=False)
    created_at = ma.auto_field(dump_only=True)


project_schema = ProjectSchema()
projects_schema = ProjectSchema(many=True)


class ProjectCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(load_default="")


class ProjectUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String()
    archived = fields.Boolean()


class MemberAddSchema(Schema):
    email = fields.Email(required=True)
    role = fields.String(
        load_default="member",
        validate=validate.OneOf(["member"]),
    )


project_create_schema = ProjectCreateSchema()
project_update_schema = ProjectUpdateSchema()
member_add_schema = MemberAddSchema()


class ProjectMemberSchema(Schema):
    user_id = fields.Integer()
    email = fields.String()
    full_name = fields.String()
    role = fields.String()
    joined_at = fields.DateTime()
