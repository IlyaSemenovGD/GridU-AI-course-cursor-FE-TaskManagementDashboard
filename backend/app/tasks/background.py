"""Background jobs (Celery): notifications and cache maintenance."""

from __future__ import annotations

import logging

from app.celery_app import celery
from app.extensions import db
from app.models.order import Order
from app.models.task import Task
from app.models.user import User
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


@celery.task(name="tasks.send_order_confirmation_email")
def send_order_confirmation_email(order_id: int) -> None:
    """Send order confirmation after successful checkout (stub email)."""
    order = db.session.get(Order, order_id)
    if order is None:
        logger.warning("send_order_confirmation_email: missing order %s", order_id)
        return
    user = db.session.get(User, order.user_id)
    if user is None:
        return
    lines_desc = []
    for li in order.items:
        name = li.product.name if li.product else f"product #{li.product_id}"
        lines_desc.append(
            f"  - {name} x{li.quantity} @ ${li.unit_price_cents / 100:.2f}"
        )
    body = (
        f"Hi {user.full_name},\n\n"
        f"Your order #{order.id} is confirmed.\n"
        f"Payment ref: {order.payment_reference or 'n/a'}\n"
        f"Subtotal: ${order.subtotal_cents / 100:.2f}\n"
        f"Discount: ${order.discount_cents / 100:.2f}\n"
        f"Total charged: ${order.total_cents / 100:.2f}\n\n"
        "Items:\n"
        + "\n".join(lines_desc)
        + "\n\nThank you for shopping with TaskFlow."
    )
    send_email(
        user.email,
        f"Order #{order.id} — confirmation",
        body,
        meta={"order_id": order_id, "user_id": user.id},
    )
