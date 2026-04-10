"""In-app notifications and email stubs for ticket lifecycle events."""

from __future__ import annotations

from app.extensions import db
from app.models.notification import Notification
from app.models.support import SupportTicket
from app.models.user import User
from app.services.email_stub import send_email


def notify_ticket_created(ticket: SupportTicket, customer: User | None) -> None:
    send_email(
        ticket.customer_email,
        f"Ticket {ticket.ticket_number} received",
        f"Your support request \"{ticket.subject}\" was received. "
        f"We will respond according to priority {ticket.priority}.",
        meta={"ticket_id": ticket.id},
    )
    if customer:
        n = Notification(
            user_id=customer.id,
            type="support_ticket_created",
            title=f"Ticket {ticket.ticket_number} created",
            body=ticket.subject,
            entity_type="support_ticket",
            entity_id=str(ticket.id),
        )
        db.session.add(n)


def notify_ticket_assigned(ticket: SupportTicket, agent: User) -> None:
    send_email(
        agent.email,
        f"Ticket {ticket.ticket_number} assigned to you",
        f"Subject: {ticket.subject}",
        meta={"ticket_id": ticket.id},
    )
    n = Notification(
        user_id=agent.id,
        type="support_ticket_assigned",
        title=f"Assigned: {ticket.ticket_number}",
        body=ticket.subject,
        entity_type="support_ticket",
        entity_id=str(ticket.id),
    )
    db.session.add(n)


def notify_status_change(
    ticket: SupportTicket, recipient: User, new_status: str
) -> None:
    send_email(
        recipient.email,
        f"Ticket {ticket.ticket_number} is now {new_status}",
        f"Subject: {ticket.subject}",
        meta={"ticket_id": ticket.id},
    )
    n = Notification(
        user_id=recipient.id,
        type="support_ticket_status",
        title=f"{ticket.ticket_number}: {new_status}",
        body=ticket.subject,
        entity_type="support_ticket",
        entity_id=str(ticket.id),
    )
    db.session.add(n)


def notify_new_comment(
    ticket: SupportTicket, recipient: User, preview: str
) -> None:
    send_email(
        recipient.email,
        f"New comment on {ticket.ticket_number}",
        preview[:500],
        meta={"ticket_id": ticket.id},
    )
    n = Notification(
        user_id=recipient.id,
        type="support_ticket_comment",
        title=f"Comment on {ticket.ticket_number}",
        body=preview[:300],
        entity_type="support_ticket",
        entity_id=str(ticket.id),
    )
    db.session.add(n)
