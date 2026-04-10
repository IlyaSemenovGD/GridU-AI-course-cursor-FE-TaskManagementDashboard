"""Access rules for tasks (personal vs project-scoped)."""

from sqlalchemy import and_, or_

from app.extensions import db
from app.models.project import ProjectMember
from app.models.task import Task


def project_ids_for_user(user_id: int) -> list[int]:
    rows = (
        db.session.query(ProjectMember.project_id)
        .filter_by(user_id=user_id)
        .all()
    )
    return [r[0] for r in rows]


def task_query_visible_to_user(user_id: int):
    """Tasks: owned personal tasks OR tasks in projects the user belongs to."""
    pids = project_ids_for_user(user_id)
    conds = [and_(Task.user_id == user_id, Task.project_id.is_(None))]
    if pids:
        conds.append(Task.project_id.in_(pids))
    return Task.query.filter(or_(*conds))


def can_access_task(user_id: int, task: Task) -> bool:
    if task.project_id is None:
        return task.user_id == user_id
    return (
        ProjectMember.query.filter_by(
            project_id=task.project_id, user_id=user_id
        ).first()
        is not None
    )


def is_project_owner(project_id: int, user_id: int) -> bool:
    from app.models.project import Project

    p = db.session.get(Project, project_id)
    return p is not None and p.owner_id == user_id
