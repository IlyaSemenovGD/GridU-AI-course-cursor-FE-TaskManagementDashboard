"""Background jobs (Celery): notifications and cache maintenance."""

from __future__ import annotations

import logging

from app.celery_app import celery
from app.extensions import db
from app.models.task import Task
from app.services.email_stub import send_email
from app.services.task_list_cache import invalidate_for_task_id

logger = logging.getLogger(__name__)


@celery.task(name="tasks.notify_task_created")
def notify_task_created(task_id: str) -> None:
    """Send async notification after a personal task is created (email stub)."""
    task = db.session.get(Task, task_id)
    if task is None:
        logger.warning("notify_task_created: missing task %s", task_id)
        return
    send_email(
        task.assignee,
        f"New task: {task.title}",
        f"You have a new task due {task.due_date}.",
        meta={"task_id": task_id, "user_id": task.user_id},
    )


@celery.task(name="tasks.invalidate_task_cache_by_id")
def invalidate_task_cache_by_id(task_id: str) -> None:
    """Invalidate merged task-list cache for all users who can see this task."""
    invalidate_for_task_id(task_id)


@celery.task(name="tasks.ping_worker")
def ping_worker() -> str:
    """Health check for Celery workers."""
    return "pong"
