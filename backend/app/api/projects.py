"""Project CRUD, team members, and project-scoped tasks."""

from flask import Blueprint, abort, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.project_schema import (
    ProjectUpdateSchema,
    member_add_schema,
    project_create_schema,
    project_schema,
    projects_schema,
)
from app.schemas.task_schema import (
    TaskUpdateSchema,
    task_create_schema,
    task_schema,
    tasks_schema,
)
from app.services.notification_service import notify_project_except
from app.services.task_list_cache import invalidate_for_project, invalidate_for_task
from app.tasks.background import notify_task_created

bp = Blueprint("projects", __name__)


def _uid() -> int:
    return int(get_jwt_identity())


def _require_member(project_id: int, user_id: int) -> ProjectMember:
    m = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if m is None:
        abort(404, description="Project not found or access denied")
    return m


def _require_owner(project_id: int, user_id: int) -> Project:
    p = db.session.get(Project, project_id)
    if p is None:
        abort(404, description="Project not found")
    if p.owner_id != user_id:
        abort(403, description="Only the project owner can perform this action")
    return p


@bp.get("/projects")
@jwt_required()
def list_projects():
    uid = _uid()
    pids = [
        r[0]
        for r in db.session.query(ProjectMember.project_id)
        .filter_by(user_id=uid)
        .all()
    ]
    if not pids:
        return [], 200
    rows = Project.query.filter(Project.id.in_(pids)).order_by(Project.name).all()
    return projects_schema.dump(rows), 200


@bp.post("/projects")
@jwt_required()
def create_project():
    uid = _uid()
    data = request.get_json(silent=True) or {}
    errors = project_create_schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    payload = project_create_schema.load(data)
    p = Project(
        name=payload["name"],
        description=payload.get("description") or "",
        owner_id=uid,
    )
    db.session.add(p)
    db.session.flush()
    db.session.add(ProjectMember(project_id=p.id, user_id=uid, role="owner"))
    db.session.commit()
    return project_schema.dump(p), 201


@bp.get("/projects/<int:project_id>")
@jwt_required()
def get_project(project_id: int):
    _require_member(project_id, _uid())
    p = db.session.get(Project, project_id)
    return project_schema.dump(p), 200


@bp.patch("/projects/<int:project_id>")
@jwt_required()
def update_project(project_id: int):
    uid = _uid()
    p = _require_owner(project_id, uid)
    data = request.get_json(silent=True) or {}
    schema = ProjectUpdateSchema(partial=True)
    errors = schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    patch = schema.load(data)
    for key, value in patch.items():
        setattr(p, key, value)
    db.session.commit()
    notify_project_except(
        project_id,
        event_type="project_updated",
        title=f'Project updated: {p.name}',
        body="Project details were changed.",
        entity_type="project",
        entity_id=str(p.id),
        actor_user_id=uid,
    )
    return project_schema.dump(p), 200


@bp.delete("/projects/<int:project_id>")
@jwt_required()
def delete_project(project_id: int):
    uid = _uid()
    p = _require_owner(project_id, uid)
    invalidate_for_project(project_id)
    Task.query.filter_by(project_id=project_id).delete()
    ProjectMember.query.filter_by(project_id=project_id).delete()
    db.session.delete(p)
    db.session.commit()
    return "", 204


@bp.get("/projects/<int:project_id>/members")
@jwt_required()
def list_members(project_id: int):
    _require_member(project_id, _uid())
    members = ProjectMember.query.filter_by(project_id=project_id).all()
    out = []
    for m in members:
        u = db.session.get(User, m.user_id)
        if u is None:
            continue
        out.append(
            {
                "user_id": m.user_id,
                "email": u.email,
                "full_name": u.full_name,
                "role": m.role,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
        )
    return out, 200


@bp.post("/projects/<int:project_id>/members")
@jwt_required()
def add_member(project_id: int):
    uid = _uid()
    _require_owner(project_id, uid)
    data = request.get_json(silent=True) or {}
    errors = member_add_schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    payload = member_add_schema.load(data)
    email = payload["email"].strip().lower()
    user = User.query.filter_by(email=email).first()
    if user is None:
        return {"message": "No registered user with that email."}, 404
    if ProjectMember.query.filter_by(
        project_id=project_id, user_id=user.id
    ).first():
        return {"message": "User is already a member."}, 409
    m = ProjectMember(
        project_id=project_id,
        user_id=user.id,
        role="member",
    )
    db.session.add(m)
    db.session.commit()
    invalidate_for_project(project_id)
    p = db.session.get(Project, project_id)
    notify_project_except(
        project_id,
        event_type="member_added",
        title=f"{user.full_name or user.username} joined {p.name}",
        body="A new collaborator was added to the project.",
        entity_type="project",
        entity_id=str(project_id),
        actor_user_id=uid,
    )
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": m.role,
    }, 201


@bp.delete("/projects/<int:project_id>/members/<int:member_user_id>")
@jwt_required()
def remove_member(project_id: int, member_user_id: int):
    uid = _uid()
    p = db.session.get(Project, project_id)
    if p is None:
        abort(404, description="Project not found")
    m = ProjectMember.query.filter_by(
        project_id=project_id, user_id=member_user_id
    ).first()
    if m is None:
        abort(404, description="Member not found")
    if m.role == "owner":
        return {"message": "Cannot remove the project owner."}, 400
    if uid != p.owner_id and uid != member_user_id:
        abort(403, description="Only the owner can remove members (or leave yourself)")
    db.session.delete(m)
    db.session.commit()
    invalidate_for_project(project_id)
    return "", 204


@bp.get("/projects/<int:project_id>/tasks")
@jwt_required()
def list_project_tasks(project_id: int):
    _require_member(project_id, _uid())
    rows = (
        Task.query.filter_by(project_id=project_id).order_by(Task.title).all()
    )
    return tasks_schema.dump(rows), 200


@bp.post("/projects/<int:project_id>/tasks")
@jwt_required()
def create_project_task(project_id: int):
    uid = _uid()
    _require_member(project_id, uid)
    data = request.get_json(silent=True) or {}
    errors = task_create_schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    payload = task_create_schema.load(data)
    task = Task(
        user_id=uid,
        project_id=project_id,
        title=payload["title"],
        description=payload.get("description") or "",
        due_date=payload["due_date"],
        priority=payload["priority"],
        status="todo",
        assignee=payload["assignee"],
    )
    db.session.add(task)
    db.session.commit()
    invalidate_for_task(task)
    notify_task_created.delay(task.id)
    notify_project_except(
        project_id,
        event_type="task_created",
        title=f'New task: {task.title}',
        body="A task was created in this project.",
        entity_type="task",
        entity_id=task.id,
        actor_user_id=uid,
    )
    return task_schema.dump(task), 201


@bp.patch("/projects/<int:project_id>/tasks/<task_id>")
@jwt_required()
def update_project_task(project_id: int, task_id: str):
    uid = _uid()
    _require_member(project_id, uid)
    task = Task.query.filter_by(id=task_id, project_id=project_id).first()
    if task is None:
        return {"message": "Task not found"}, 404
    data = request.get_json(silent=True) or {}
    schema = TaskUpdateSchema(partial=True)
    errors = schema.validate(data)
    if errors:
        return {"errors": errors}, 400
    patch = schema.load(data)
    for key, value in patch.items():
        setattr(task, key, value)
    db.session.commit()
    invalidate_for_task(task)
    notify_project_except(
        project_id,
        event_type="task_updated",
        title=f'Task updated: {task.title}',
        body="A task was modified.",
        entity_type="task",
        entity_id=task.id,
        actor_user_id=uid,
    )
    return task_schema.dump(task), 200


@bp.delete("/projects/<int:project_id>/tasks/<task_id>")
@jwt_required()
def delete_project_task(project_id: int, task_id: str):
    uid = _uid()
    _require_member(project_id, uid)
    task = Task.query.filter_by(id=task_id, project_id=project_id).first()
    if task is None:
        return {"message": "Task not found"}, 404
    title = task.title
    invalidate_for_task(task)
    db.session.delete(task)
    db.session.commit()
    notify_project_except(
        project_id,
        event_type="task_deleted",
        title=f"Task removed: {title}",
        body="A task was deleted from this project.",
        entity_type="task",
        entity_id=task_id,
        actor_user_id=uid,
    )
    return "", 204
