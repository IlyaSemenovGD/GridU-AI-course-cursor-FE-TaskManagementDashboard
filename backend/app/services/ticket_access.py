"""Who may view or mutate which support tickets."""

from __future__ import annotations

from sqlalchemy import func, or_

from app.extensions import db
from app.models.support import SupportTicket
from app.models.user import User, UserRole


def ticket_query_visible_to_user(user: User):
    q = SupportTicket.query
    if user.role == UserRole.ADMIN.value:
        return q
    if user.role == UserRole.AGENT.value:
        return q.filter(
            or_(
                SupportTicket.assigned_to_id == user.id,
                SupportTicket.assigned_to_id.is_(None),
            )
        )
    return q.filter(
        or_(
            SupportTicket.customer_user_id == user.id,
            func.lower(SupportTicket.customer_email) == user.email.lower(),
        )
    )


def user_can_view_ticket(user: User, ticket: SupportTicket) -> bool:
    if user.role == UserRole.ADMIN.value:
        return True
    if user.role == UserRole.AGENT.value:
        return ticket.assigned_to_id == user.id or ticket.assigned_to_id is None
    return (
        ticket.customer_user_id == user.id
        or ticket.customer_email.lower() == user.email.lower()
    )


def require_agent_or_admin(user: User) -> bool:
    return user.role in (UserRole.AGENT.value, UserRole.ADMIN.value)


def require_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN.value


def get_user_or_404(user_id: int) -> User | None:
    return db.session.get(User, user_id)
