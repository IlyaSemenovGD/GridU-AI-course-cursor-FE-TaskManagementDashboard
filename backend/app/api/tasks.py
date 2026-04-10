"""Personal tasks (no project) and unified access for tasks visible to the user."""

from flasgger import swag_from
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.task import Task
from app.schemas.task_schema import (
    TaskUpdateSchema,
    task_create_schema,
    task_schema,
    tasks_schema,
)
from app.services.task_access import can_access_task, task_query_visible_to_user

bp = Blueprint("tasks", __name__)


def _current_user_id() -> int:
    return int(get_jwt_identity())


@bp.get("/tasks")
@jwt_required()
@swag_from(
    {
        "tags": ["Tasks"],
        "summary": "List tasks (personal + projects you belong to)",
        "security": [{"Bearer": []}],
        "responses": {200: {"description": "Task list"}, 401: {"description": "Unauthorized"}},
    }
)
def list_tasks():
    uid = _current_user_id()
    rows = task_query_visible_to_user(uid).order_by(Task.title).all()
    return tasks_schema.dump(rows), 200


@bp.post("/tasks")
@jwt_required()
@swag_from(
    {
        "tags": ["Tasks"],
        "summary": "Create a personal task (not tied to a project)",
        "security": [{"Bearer": []}],
        "responses": {
            201: {"description": "Created"},
            400: {"description": "Validation error"},
            401: {"description": "Unauthorized"},
        },
    }
)
def create_task():
    data = request.get_json(silent=True) or {}
    errors = task_create_schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    payload = task_create_schema.load(data)
    uid = _current_user_id()
    task = Task(
        user_id=uid,
        project_id=None,
        title=payload["title"],
        description=payload.get("description") or "",
        due_date=payload["due_date"],
        priority=payload["priority"],
        status="todo",
        assignee=payload["assignee"],
    )
    db.session.add(task)
    db.session.commit()
    return task_schema.dump(task), 201


@bp.patch("/tasks/<task_id>")
@jwt_required()
@swag_from(
    {
        "tags": ["Tasks"],
        "summary": "Update a task you can access",
        "security": [{"Bearer": []}],
        "parameters": [
            {"name": "task_id", "in": "path", "type": "string", "required": True}
        ],
        "responses": {
            200: {"description": "Updated"},
            404: {"description": "Not found"},
            401: {"description": "Unauthorized"},
        },
    }
)
def update_task(task_id: str):
    uid = _current_user_id()
    task = Task.query.filter_by(id=task_id).first()
    if task is None or not can_access_task(uid, task):
        return {"message": "Task not found"}, 404
    data = request.get_json(silent=True) or {}
    partial_schema = TaskUpdateSchema(partial=True)
    errors = partial_schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    patch = partial_schema.load(data)
    for key, value in patch.items():
        setattr(task, key, value)
    db.session.commit()
    return task_schema.dump(task), 200


@bp.delete("/tasks/<task_id>")
@jwt_required()
@swag_from(
    {
        "tags": ["Tasks"],
        "summary": "Delete a task you can access",
        "security": [{"Bearer": []}],
        "parameters": [
            {"name": "task_id", "in": "path", "type": "string", "required": True}
        ],
        "responses": {204: {"description": "Deleted"}, 404: {"description": "Not found"}},
    }
)
def delete_task(task_id: str):
    uid = _current_user_id()
    task = Task.query.filter_by(id=task_id).first()
    if task is None or not can_access_task(uid, task):
        return {"message": "Task not found"}, 404
    db.session.delete(task)
    db.session.commit()
    return "", 204
