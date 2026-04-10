"""Customer support tickets, comments, attachments, and history."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from app.extensions import db


class TicketStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketCategory(str, Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    GENERAL = "general"
    FEATURE_REQUEST = "feature_request"


class SupportTicket(db.Model):
    __tablename__ = "support_tickets"

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), nullable=False, index=True)
    priority = db.Column(db.String(20), nullable=False, index=True)
    category = db.Column(db.String(40), nullable=False, index=True)
    customer_email = db.Column(db.String(120), nullable=False, index=True)
    customer_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    first_response_at = db.Column(db.DateTime(timezone=True), nullable=True)
    first_response_due_at = db.Column(db.DateTime(timezone=True), nullable=True)
    resolution_due_at = db.Column(db.DateTime(timezone=True), nullable=True)
    sla_response_breached = db.Column(db.Boolean, nullable=False, default=False)
    sla_resolution_breached = db.Column(db.Boolean, nullable=False, default=False)
    resolved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    closed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    customer_user = db.relationship(
        "User", foreign_keys=[customer_user_id], backref="support_tickets_as_customer"
    )
    created_by = db.relationship(
        "User", foreign_keys=[created_by_id], backref="support_tickets_created"
    )
    assigned_to = db.relationship(
        "User", foreign_keys=[assigned_to_id], backref="support_tickets_assigned"
    )


class TicketComment(db.Model):
    __tablename__ = "ticket_comments"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("support_tickets.id"), nullable=False, index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, nullable=False, default=False)
    mention_user_ids = db.Column(db.Text, nullable=False, default="[]")
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ticket = db.relationship("SupportTicket", backref=db.backref("comments", lazy="dynamic"))
    user = db.relationship("User", backref=db.backref("ticket_comments", lazy="dynamic"))


class TicketAttachment(db.Model):
    __tablename__ = "ticket_attachments"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("support_tickets.id"), nullable=False, index=True
    )
    comment_id = db.Column(
        db.Integer, db.ForeignKey("ticket_comments.id"), nullable=True, index=True
    )
    filename = db.Column(db.String(255), nullable=False)
    stored_path = db.Column(db.String(512), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    mime_type = db.Column(db.String(120), nullable=False)
    uploaded_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ticket = db.relationship("SupportTicket", backref=db.backref("attachments", lazy="dynamic"))
    comment = db.relationship("TicketComment", backref=db.backref("attachments", lazy="dynamic"))


class TicketAssignment(db.Model):
    __tablename__ = "ticket_assignments"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("support_tickets.id"), nullable=False, index=True
    )
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ticket = db.relationship("SupportTicket", backref=db.backref("assignments", lazy="dynamic"))
    assigned_to = db.relationship(
        "User", foreign_keys=[assigned_to_id], backref="assigned_ticket_rows"
    )
    assigned_by = db.relationship(
        "User", foreign_keys=[assigned_by_id], backref="assignment_actions"
    )


class TicketStatusHistory(db.Model):
    __tablename__ = "ticket_status_history"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("support_tickets.id"), nullable=False, index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    old_status = db.Column(db.String(32), nullable=True)
    new_status = db.Column(db.String(32), nullable=False)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ticket = db.relationship("SupportTicket", backref=db.backref("status_history", lazy="dynamic"))
    user = db.relationship("User")


class TicketPriorityChange(db.Model):
    __tablename__ = "ticket_priority_changes"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(
        db.Integer, db.ForeignKey("support_tickets.id"), nullable=False, index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    old_priority = db.Column(db.String(20), nullable=False)
    new_priority = db.Column(db.String(20), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ticket = db.relationship(
        "SupportTicket", backref=db.backref("priority_changes", lazy="dynamic")
    )
    user = db.relationship("User")
