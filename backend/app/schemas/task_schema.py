"""Task serialization and validation."""

from marshmallow import Schema, fields, validate

from app.extensions import db, ma
from app.models.task import Task


class TaskSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Task
        load_instance = True
        sqla_session = db.session
        include_fk = True

    id = ma.auto_field(dump_only=True)
    user_id = ma.auto_field(dump_only=True)
    project_id = ma.auto_field(dump_only=True, allow_none=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=500))
    description = fields.String(load_default="")
    due_date = fields.String(required=True)
    priority = fields.String(
        required=True, validate=validate.OneOf(["low", "medium", "high"])
    )
    status = fields.String(
        required=True,
        validate=validate.OneOf(["todo", "in-progress", "done"]),
    )
    assignee = fields.String(required=True)


task_schema = TaskSchema()
tasks_schema = TaskSchema(many=True)


class TaskCreateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=500))
    description = fields.String(load_default="")
    due_date = fields.String(required=True)
    priority = fields.String(
        required=True, validate=validate.OneOf(["low", "medium", "high"])
    )
    assignee = fields.String(required=True)


class TaskUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=500))
    description = fields.String()
    due_date = fields.String()
    priority = fields.String(validate=validate.OneOf(["low", "medium", "high"]))
    status = fields.String(validate=validate.OneOf(["todo", "in-progress", "done"]))
    assignee = fields.String()


task_create_schema = TaskCreateSchema()
task_update_schema = TaskUpdateSchema()
