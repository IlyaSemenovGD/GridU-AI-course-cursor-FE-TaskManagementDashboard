"""Ticket numbers, SLA windows, status transitions, auto-assignment."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import func

from app.extensions import db
from app.models.support import (
    SupportTicket,
    TicketAssignment,
    TicketPriorityChange,
    TicketStatusHistory,
    TicketStatus,
)
from app.models.user import AgentAvailability, User, UserRole

if TYPE_CHECKING:
    pass

# (first_response_hours, resolution_hours)
SLA_HOURS: dict[str, tuple[int, int]] = {
    "urgent": (2, 24),
    "high": (4, 48),
    "medium": (8, 120),  # 5 days
    "low": (24, 240),  # 10 days
}

ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    TicketStatus.OPEN.value: {
        TicketStatus.ASSIGNED.value,
        TicketStatus.CLOSED.value,
    },
    TicketStatus.ASSIGNED.value: {
        TicketStatus.IN_PROGRESS.value,
        TicketStatus.CLOSED.value,
    },
    TicketStatus.IN_PROGRESS.value: {
        TicketStatus.WAITING.value,
        TicketStatus.RESOLVED.value,
        TicketStatus.CLOSED.value,
    },
    TicketStatus.WAITING.value: {TicketStatus.IN_PROGRESS.value},
    TicketStatus.RESOLVED.value: {
        TicketStatus.CLOSED.value,
        TicketStatus.REOPENED.value,
    },
    TicketStatus.CLOSED.value: {TicketStatus.REOPENED.value},
    TicketStatus.REOPENED.value: {TicketStatus.IN_PROGRESS.value},
}

REOPEN_DAYS = 7


def next_ticket_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"TICK-{today}-"
    last = (
        SupportTicket.query.filter(SupportTicket.ticket_number.startswith(prefix))
        .order_by(SupportTicket.ticket_number.desc())
        .first()
    )
    if last is None:
        seq = 1
    else:
        try:
            seq = int(last.ticket_number.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    return f"{prefix}{seq:04d}"


def compute_sla_deadlines(
    created_at: datetime, priority: str
) -> tuple[datetime, datetime]:
    pr = priority.lower()
    fr_h, res_h = SLA_HOURS.get(pr, SLA_HOURS["medium"])
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    first_due = created_at + timedelta(hours=fr_h)
    res_due = created_at + timedelta(hours=res_h)
    return first_due, res_due


def can_transition_to(
    current: str, new_status: str, *, closed_at: datetime | None
) -> bool:
    current = current.lower()
    new_status = new_status.lower()
    if current == TicketStatus.CLOSED.value and new_status == TicketStatus.REOPENED.value:
        if closed_at is None:
            return False
        if closed_at.tzinfo is None:
            closed_at = closed_at.replace(tzinfo=timezone.utc)
        limit = closed_at + timedelta(days=REOPEN_DAYS)
        return datetime.now(timezone.utc) <= limit
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current, set())
    return new_status in allowed


def auto_assign_agent(category: str) -> User | None:
    """Pick agent with lowest open ticket count; prefer optional category expertise."""
    agents = (
        User.query.filter(User.role == UserRole.AGENT.value)
        .filter(
            (User.availability_status == AgentAvailability.AVAILABLE.value)
            | (User.availability_status.is_(None))
        )
        .all()
    )
    if not agents:
        agents = User.query.filter(User.role == UserRole.AGENT.value).all()
    if not agents:
        return None

    open_counts: dict[int, int] = {}
    open_statuses = (
        TicketStatus.OPEN.value,
        TicketStatus.ASSIGNED.value,
        TicketStatus.IN_PROGRESS.value,
        TicketStatus.WAITING.value,
        TicketStatus.REOPENED.value,
    )
    for a in agents:
        cnt = (
            db.session.query(func.count(SupportTicket.id))
            .filter(
                SupportTicket.assigned_to_id == a.id,
                SupportTicket.status.in_(open_statuses),
            )
            .scalar()
        )
        open_counts[a.id] = int(cnt or 0)

    def score(u: User) -> tuple[int, int]:
        areas = u.expertise_areas_list()
        cat = category.lower()
        match = 0 if cat in [a.lower() for a in areas] else 1
        return (open_counts.get(u.id, 0), match)

    agents.sort(key=score)
    return agents[0]


def record_status_change(
    ticket: SupportTicket,
    user_id: int,
    old_status: str | None,
    new_status: str,
    note: str | None = None,
) -> None:
    row = TicketStatusHistory(
        ticket_id=ticket.id,
        user_id=user_id,
        old_status=old_status,
        new_status=new_status,
        note=note,
    )
    db.session.add(row)


def record_priority_change(
    ticket: SupportTicket,
    user_id: int,
    old_p: str,
    new_p: str,
    reason: str,
) -> None:
    row = TicketPriorityChange(
        ticket_id=ticket.id,
        user_id=user_id,
        old_priority=old_p,
        new_priority=new_p,
        reason=reason,
    )
    db.session.add(row)
    first_due, res_due = compute_sla_deadlines(
        ticket.created_at, new_p
    )
    ticket.first_response_due_at = first_due
    ticket.resolution_due_at = res_due


def record_assignment(
    ticket: SupportTicket, assigned_to_id: int, assigned_by_id: int
) -> None:
    row = TicketAssignment(
        ticket_id=ticket.id,
        assigned_to_id=assigned_to_id,
        assigned_by_id=assigned_by_id,
    )
    db.session.add(row)


def update_sla_flags(ticket: SupportTicket) -> None:
    """Recompute breach flags from current time and due dates."""
    now = datetime.now(timezone.utc)
    if ticket.first_response_due_at and ticket.first_response_at is None:
        fd = ticket.first_response_due_at
        if fd.tzinfo is None:
            fd = fd.replace(tzinfo=timezone.utc)
        if now > fd:
            ticket.sla_response_breached = True
    if ticket.resolution_due_at and ticket.resolved_at is None:
        rd = ticket.resolution_due_at
        if rd.tzinfo is None:
            rd = rd.replace(tzinfo=timezone.utc)
        if now > rd:
            ticket.sla_resolution_breached = True


def mention_json(user_ids: list[int]) -> str:
    return json.dumps([int(x) for x in user_ids])
