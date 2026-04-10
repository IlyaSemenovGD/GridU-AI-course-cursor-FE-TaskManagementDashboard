"""Redis / SimpleCache layer for GET /api/tasks merged list."""

from __future__ import annotations

from app.extensions import cache, db
from app.models.project import ProjectMember
from app.models.task import Task

TASK_LIST_KEY = "tasks:list:{user_id}"


def _key(user_id: int) -> str:
    return TASK_LIST_KEY.format(user_id=user_id)


def get_task_list_json(user_id: int):
    """Return cached task list payload (list of dicts) or None."""
    return cache.get(_key(user_id))


def set_task_list_json(user_id: int, data: list | dict, timeout: int | None = None) -> None:
    cache.set(_key(user_id), data, timeout=timeout)


def invalidate_user_task_list(user_id: int) -> None:
    cache.delete(_key(user_id))


def user_ids_for_task_visibility(task: Task) -> set[int]:
    """Users whose merged /api/tasks view can include this task."""
    out: set[int] = {task.user_id}
    if task.project_id is not None:
        rows = ProjectMember.query.filter_by(project_id=task.project_id).all()
        for m in rows:
            out.add(m.user_id)
    return out


def invalidate_for_task(task: Task) -> None:
    for uid in user_ids_for_task_visibility(task):
        invalidate_user_task_list(uid)


def invalidate_for_task_id(task_id: str) -> None:
    task = db.session.get(Task, task_id)
    if task is not None:
        invalidate_for_task(task)


def invalidate_for_project(project_id: int) -> None:
    """All current members (task visibility may change)."""
    rows = ProjectMember.query.filter_by(project_id=project_id).all()
    for m in rows:
        invalidate_user_task_list(m.user_id)
