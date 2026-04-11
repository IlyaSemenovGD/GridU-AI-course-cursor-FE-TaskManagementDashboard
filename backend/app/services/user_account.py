"""Cascade deletes for user account removal."""

from __future__ import annotations

import os

from sqlalchemy import or_

from app.extensions import db
from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.models.support import (
    SupportTicket,
    TicketAssignment,
    TicketAttachment,
    TicketComment,
    TicketPriorityChange,
    TicketStatusHistory,
)
from app.models.task import Task
from app.models.user import User


def _delete_support_ticket_files_and_rows(ticket: SupportTicket) -> None:
    for att in list(ticket.attachments):
        path = att.stored_path
        if path and os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass
    TicketAttachment.query.filter_by(ticket_id=ticket.id).delete(
        synchronize_session=False
    )
    TicketComment.query.filter_by(ticket_id=ticket.id).delete(synchronize_session=False)
    TicketStatusHistory.query.filter_by(ticket_id=ticket.id).delete(
        synchronize_session=False
    )
    TicketPriorityChange.query.filter_by(ticket_id=ticket.id).delete(
        synchronize_session=False
    )
    TicketAssignment.query.filter_by(ticket_id=ticket.id).delete(
        synchronize_session=False
    )
    db.session.delete(ticket)


def purge_user_account(user: User) -> None:
    """
    Remove all data tied to this user so the user row can be deleted.
    Does not commit — caller commits.
    """
    uid = user.id

    Notification.query.filter_by(user_id=uid).delete(synchronize_session=False)

    Task.query.filter_by(user_id=uid).delete(synchronize_session=False)

    owned = Project.query.filter_by(owner_id=uid).all()
    for proj in owned:
        Task.query.filter_by(project_id=proj.id).delete(synchronize_session=False)
        ProjectMember.query.filter_by(project_id=proj.id).delete(
            synchronize_session=False
        )
        db.session.delete(proj)

    ProjectMember.query.filter_by(user_id=uid).delete(synchronize_session=False)

    tickets_to_remove = SupportTicket.query.filter(
        or_(SupportTicket.customer_user_id == uid, SupportTicket.created_by_id == uid)
    ).all()
    for t in tickets_to_remove:
        _delete_support_ticket_files_and_rows(t)

    for st in SupportTicket.query.filter_by(assigned_to_id=uid).all():
        st.assigned_to_id = None

    TicketComment.query.filter_by(user_id=uid).delete(synchronize_session=False)
    TicketAssignment.query.filter(
        or_(
            TicketAssignment.assigned_to_id == uid,
            TicketAssignment.assigned_by_id == uid,
        )
    ).delete(synchronize_session=False)
    TicketStatusHistory.query.filter_by(user_id=uid).delete(synchronize_session=False)
    TicketPriorityChange.query.filter_by(user_id=uid).delete(synchronize_session=False)

    db.session.delete(user)
