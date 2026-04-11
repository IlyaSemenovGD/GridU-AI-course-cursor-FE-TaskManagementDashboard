"""Customer support tickets API (PRD §6.2)."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.support import (
    TicketAssignment,
    TicketAttachment,
    TicketComment,
    TicketPriorityChange,
    TicketStatus,
    TicketStatusHistory,
    SupportTicket,
)
from app.models.user import User, UserRole
from app.schemas.support_schema import (
    MAX_ATTACHMENTS_PER_TICKET,
    MAX_ATTACHMENT_BYTES,
    ALLOWED_ATTACHMENT_EXT,
    comment_create_schema,
    comment_dump_schema,
    ticket_assign_schema,
    ticket_create_schema,
    ticket_dump_schema,
    ticket_priority_schema,
    ticket_status_schema,
    ticket_update_schema,
)
from app.services.ticket_access import (
    get_user_or_404,
    require_agent_or_admin,
    require_admin,
    ticket_query_visible_to_user,
    user_can_view_ticket,
)
from app.services.ticket_core import (
    auto_assign_agent,
    can_transition_to,
    compute_sla_deadlines,
    mention_json,
    next_ticket_number,
    record_assignment,
    record_priority_change,
    record_status_change,
    update_sla_flags,
)
from app.services.ticket_notify import (
    notify_new_comment,
    notify_status_change,
    notify_ticket_assigned,
    notify_ticket_created,
)
from app.utils.file_signatures import content_matches_extension
from app.utils.text_sanitize import sanitize_plain

bp = Blueprint("support_tickets", __name__)


def _current_user() -> User | None:
    uid = get_jwt_identity()
    if uid is None:
        return None
    return get_user_or_404(int(uid))


def _error(message: str, code: str, status: int, errors: dict | None = None):
    payload = {"status": "error", "message": message, "code": code}
    if errors:
        payload["errors"] = errors
    return payload, status


def _create_payload_and_files() -> tuple[dict, list]:
    """JSON body, or multipart form with optional `file` fields (PRD: attachments on create)."""
    ct = (request.content_type or "").lower()
    if "multipart/form-data" in ct:
        payload = {
            "subject": request.form.get("subject") or "",
            "description": request.form.get("description") or "",
            "priority": request.form.get("priority") or "",
            "category": request.form.get("category") or "",
            "customer_email": request.form.get("customer_email") or "",
            "auto_assign": request.form.get("auto_assign", "true").lower()
            in ("1", "true", "yes", "on"),
        }
        raw = request.files.getlist("file")
        files = [f for f in raw if f and getattr(f, "filename", None)]
        return payload, files
    return request.get_json(silent=True) or {}, []


def _uploads_dir(ticket_id: int) -> str:
    base = os.path.join(current_app.instance_path, "uploads", "tickets", str(ticket_id))
    os.makedirs(base, exist_ok=True)
    return base


def _persist_attachment_file(ticket_id: int, f) -> tuple[TicketAttachment | None, str | None]:
    """
    Save one upload: size, extension, magic-byte check (NFR-011).
    Returns (attachment, None) or (None, error_message).
    """
    if not f or not f.filename:
        return None, "file is required."
    name = secure_filename(f.filename)
    ext = os.path.splitext(name)[1].lower()
    if ext not in ALLOWED_ATTACHMENT_EXT:
        return None, "File type not allowed."
    f.stream.seek(0)
    data = f.read()
    size = len(data)
    if size > MAX_ATTACHMENT_BYTES:
        return None, "File too large (max 5MB)."
    if not content_matches_extension(data, ext):
        return None, "File content does not match the allowed type for this extension."
    dest_dir = _uploads_dir(ticket_id)
    stored_name = f"{datetime.now(timezone.utc).timestamp():.0f}_{name}"
    path = os.path.join(dest_dir, stored_name)
    with open(path, "wb") as out:
        out.write(data)
    att = TicketAttachment(
        ticket_id=ticket_id,
        comment_id=None,
        filename=name,
        stored_path=path,
        file_size=size,
        mime_type=getattr(f, "mimetype", None) or "application/octet-stream",
    )
    db.session.add(att)
    return att, None


@bp.get("/tickets")
@jwt_required()
def list_tickets():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    q = ticket_query_visible_to_user(user)

    search = (request.args.get("q") or "").strip()
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                SupportTicket.ticket_number.ilike(like),
                SupportTicket.subject.ilike(like),
                SupportTicket.description.ilike(like),
            )
        )
    if request.args.get("status"):
        statuses = [s.strip() for s in request.args.get("status").split(",") if s.strip()]
        if statuses:
            q = q.filter(SupportTicket.status.in_(statuses))
    if request.args.get("priority"):
        q = q.filter(SupportTicket.priority == request.args.get("priority").strip())
    if request.args.get("category"):
        q = q.filter(SupportTicket.category == request.args.get("category").strip())
    if request.args.get("customer_email"):
        q = q.filter(
            func.lower(SupportTicket.customer_email)
            == request.args.get("customer_email").strip().lower()
        )
    if request.args.get("assigned_to_id", type=int):
        q = q.filter(SupportTicket.assigned_to_id == request.args.get("assigned_to_id", type=int))
    if request.args.get("unassigned_only") == "1":
        q = q.filter(SupportTicket.assigned_to_id.is_(None))
    df = request.args.get("created_from")
    dt = request.args.get("created_to")
    if df:
        try:
            dfrom = datetime.fromisoformat(df.replace("Z", "+00:00"))
            q = q.filter(SupportTicket.created_at >= dfrom)
        except ValueError:
            pass
    if dt:
        try:
            dto = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            q = q.filter(SupportTicket.created_at <= dto)
        except ValueError:
            pass

    q = q.order_by(SupportTicket.created_at.desc())
    page = request.args.get("page", 1, type=int) or 1
    per_page = min(request.args.get("per_page", 20, type=int) or 20, 100)
    total = q.count()
    rows = q.offset((page - 1) * per_page).limit(per_page).all()
    for t in rows:
        update_sla_flags(t)
    db.session.commit()

    return {
        "tickets": [ticket_dump_schema.dump(t) for t in rows],
        "page": page,
        "per_page": per_page,
        "total": total,
    }, 200


@bp.post("/tickets")
@jwt_required()
def create_ticket():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    data, upload_files = _create_payload_and_files()
    if len(upload_files) > MAX_ATTACHMENTS_PER_TICKET:
        return _error(
            f"Maximum {MAX_ATTACHMENTS_PER_TICKET} attachments per ticket.",
            "VALIDATION_ERROR",
            400,
        )
    errs = ticket_create_schema.validate(data)
    if errs:
        return _error("Validation failed.", "VALIDATION_ERROR", 400, errors=errs)
    body = ticket_create_schema.load(data)
    subject = sanitize_plain(body["subject"], max_length=200)
    description = sanitize_plain(body["description"], max_length=5000)
    email = body["customer_email"].strip().lower()
    if user.role == UserRole.CUSTOMER.value and email != user.email.lower():
        return _error(
            "Customer email must match your account email.",
            "FORBIDDEN",
            403,
        )

    fr_due, res_due = compute_sla_deadlines(datetime.now(timezone.utc), body["priority"])
    ticket = SupportTicket(
        ticket_number=next_ticket_number(),
        subject=subject,
        description=description,
        status=TicketStatus.OPEN.value,
        priority=body["priority"],
        category=body["category"],
        customer_email=email,
        customer_user_id=user.id,
        created_by_id=user.id,
        first_response_due_at=fr_due,
        resolution_due_at=res_due,
    )
    db.session.add(ticket)
    db.session.flush()

    for uf in upload_files:
        _att, att_err = _persist_attachment_file(ticket.id, uf)
        if att_err:
            db.session.rollback()
            return _error(att_err, "VALIDATION_ERROR", 400)

    notify_ticket_created(ticket, user)

    if body.get("auto_assign", True):
        agent = auto_assign_agent(body["category"])
        if agent:
            ticket.assigned_to_id = agent.id
            ticket.status = TicketStatus.ASSIGNED.value
            record_assignment(ticket, agent.id, user.id)
            record_status_change(
                ticket,
                user.id,
                TicketStatus.OPEN.value,
                TicketStatus.ASSIGNED.value,
                note="Auto-assigned",
            )
            notify_ticket_assigned(ticket, agent)

    db.session.commit()
    return ticket_dump_schema.dump(ticket), 201


@bp.get("/tickets/<int:ticket_id>")
@jwt_required()
def get_ticket(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    update_sla_flags(ticket)
    db.session.commit()
    return ticket_dump_schema.dump(ticket), 200


@bp.put("/tickets/<int:ticket_id>")
@jwt_required()
def update_ticket(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_agent_or_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    data = request.get_json(silent=True) or {}
    errs = ticket_update_schema.validate(data, partial=True)
    if errs:
        return _error("Validation failed.", "VALIDATION_ERROR", 400, errors=errs)
    body = ticket_update_schema.load(data, partial=True)
    if "subject" in body:
        ticket.subject = sanitize_plain(body["subject"], max_length=200)
    if "description" in body:
        ticket.description = sanitize_plain(body["description"], max_length=5000)
    db.session.commit()
    return ticket_dump_schema.dump(ticket), 200


@bp.delete("/tickets/<int:ticket_id>")
@jwt_required()
def delete_ticket(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    for att in list(ticket.attachments):
        path = att.stored_path
        if path and os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass
    TicketAttachment.query.filter_by(ticket_id=ticket.id).delete()
    TicketComment.query.filter_by(ticket_id=ticket.id).delete()
    TicketStatusHistory.query.filter_by(ticket_id=ticket.id).delete()
    TicketPriorityChange.query.filter_by(ticket_id=ticket.id).delete()
    TicketAssignment.query.filter_by(ticket_id=ticket.id).delete()
    db.session.delete(ticket)
    db.session.commit()
    return {"status": "ok", "message": "Ticket deleted."}, 200


@bp.get("/tickets/<int:ticket_id>/comments")
@jwt_required()
def list_comments(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    q = ticket.comments.order_by(TicketComment.created_at.asc())
    if user.role == UserRole.CUSTOMER.value:
        q = q.filter(TicketComment.is_internal.is_(False))
    rows = q.all()
    return {"comments": [comment_dump_schema.dump(c) for c in rows]}, 200


@bp.post("/tickets/<int:ticket_id>/comments")
@jwt_required()
def add_comment(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    data = request.get_json(silent=True) or {}
    errs = comment_create_schema.validate(data)
    if errs:
        return _error("Validation failed.", "VALIDATION_ERROR", 400, errors=errs)
    body = comment_create_schema.load(data)
    if body.get("is_internal") and user.role == UserRole.CUSTOMER.value:
        return _error("Customers cannot post internal comments.", "FORBIDDEN", 403)
    content = sanitize_plain(body["content"], max_length=10000)
    mention_ids = body.get("mention_user_ids") or []
    c = TicketComment(
        ticket_id=ticket.id,
        user_id=user.id,
        content=content,
        is_internal=bool(body.get("is_internal")),
        mention_user_ids=mention_json(mention_ids),
    )
    db.session.add(c)
    if require_agent_or_admin(user) and ticket.first_response_at is None:
        ticket.first_response_at = datetime.now(timezone.utc)
    db.session.flush()

    # notify assignee / customer
    recipients: set[int] = set()
    if ticket.assigned_to_id and ticket.assigned_to_id != user.id:
        recipients.add(ticket.assigned_to_id)
    if ticket.customer_user_id and ticket.customer_user_id != user.id:
        recipients.add(ticket.customer_user_id)
    for uid in mention_ids:
        if isinstance(uid, int) and uid > 0:
            recipients.add(uid)
    for rid in recipients:
        ru = get_user_or_404(rid)
        if ru:
            notify_new_comment(ticket, ru, content)

    db.session.commit()
    return comment_dump_schema.dump(c), 201


@bp.put("/tickets/<int:ticket_id>/status")
@jwt_required()
def update_status(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_agent_or_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    data = request.get_json(silent=True) or {}
    errs = ticket_status_schema.validate(data)
    if errs:
        return _error("Validation failed.", "VALIDATION_ERROR", 400, errors=errs)
    body = ticket_status_schema.load(data)
    new_s = body["status"]
    old_s = ticket.status
    if not can_transition_to(old_s, new_s, closed_at=ticket.closed_at):
        return _error("Invalid status transition.", "CONFLICT", 409)
    ticket.status = new_s
    now = datetime.now(timezone.utc)
    if new_s == TicketStatus.RESOLVED.value:
        ticket.resolved_at = now
    if new_s == TicketStatus.CLOSED.value:
        ticket.closed_at = now
    if new_s == TicketStatus.REOPENED.value:
        ticket.resolved_at = None
        ticket.closed_at = None
    record_status_change(
        ticket, user.id, old_s, new_s, note=body.get("note")
    )
    update_sla_flags(ticket)

    # notifications
    if ticket.customer_user_id:
        cu = get_user_or_404(ticket.customer_user_id)
        if cu:
            notify_status_change(ticket, cu, new_s)
    if ticket.assigned_to_id:
        au = get_user_or_404(ticket.assigned_to_id)
        if au and au.id != user.id:
            notify_status_change(ticket, au, new_s)

    db.session.commit()
    return ticket_dump_schema.dump(ticket), 200


@bp.put("/tickets/<int:ticket_id>/priority")
@jwt_required()
def update_priority(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_agent_or_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    data = request.get_json(silent=True) or {}
    errs = ticket_priority_schema.validate(data)
    if errs:
        return _error("Validation failed.", "VALIDATION_ERROR", 400, errors=errs)
    body = ticket_priority_schema.load(data)
    old_p = ticket.priority
    new_p = body["priority"]
    if old_p == new_p:
        return ticket_dump_schema.dump(ticket), 200
    reason = sanitize_plain(body["reason"], max_length=2000)
    record_priority_change(ticket, user.id, old_p, new_p, reason)
    ticket.priority = new_p
    update_sla_flags(ticket)
    db.session.commit()
    return ticket_dump_schema.dump(ticket), 200


@bp.post("/tickets/<int:ticket_id>/assign")
@jwt_required()
def assign_ticket(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Only administrators can assign tickets.", "FORBIDDEN", 403)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    data = request.get_json(silent=True) or {}
    errs = ticket_assign_schema.validate(data)
    if errs:
        return _error("Validation failed.", "VALIDATION_ERROR", 400, errors=errs)
    body = ticket_assign_schema.load(data)
    agent = get_user_or_404(body["agent_id"])
    if agent is None or agent.role != UserRole.AGENT.value:
        return _error("Invalid agent.", "VALIDATION_ERROR", 400)
    old = ticket.status
    ticket.assigned_to_id = agent.id
    if ticket.status == TicketStatus.OPEN.value:
        ticket.status = TicketStatus.ASSIGNED.value
        record_status_change(
            ticket, user.id, old, TicketStatus.ASSIGNED.value, note="Manual assign"
        )
    record_assignment(ticket, agent.id, user.id)
    notify_ticket_assigned(ticket, agent)
    db.session.commit()
    return ticket_dump_schema.dump(ticket), 200


@bp.get("/tickets/<int:ticket_id>/history")
@jwt_required()
def ticket_history(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    events: list[dict] = []
    for h in ticket.status_history:
        events.append(
            {
                "type": "status",
                "at": h.created_at.isoformat(),
                "user_id": h.user_id,
                "old_status": h.old_status,
                "new_status": h.new_status,
                "note": h.note,
            }
        )
    for a in ticket.assignments:
        events.append(
            {
                "type": "assignment",
                "at": a.assigned_at.isoformat(),
                "assigned_to_id": a.assigned_to_id,
                "assigned_by_id": a.assigned_by_id,
            }
        )
    for p in ticket.priority_changes:
        events.append(
            {
                "type": "priority",
                "at": p.created_at.isoformat(),
                "user_id": p.user_id,
                "old_priority": p.old_priority,
                "new_priority": p.new_priority,
                "reason": p.reason,
            }
        )
    events.sort(key=lambda x: x["at"])
    return {"history": events}, 200


@bp.post("/tickets/<int:ticket_id>/attachments")
@jwt_required()
def upload_attachment(ticket_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error("Ticket not found.", "NOT_FOUND", 404)
    if not user_can_view_ticket(user, ticket):
        return _error("Access denied.", "FORBIDDEN", 403)
    if ticket.attachments.count() >= MAX_ATTACHMENTS_PER_TICKET:
        return _error(
            f"Maximum {MAX_ATTACHMENTS_PER_TICKET} attachments per ticket.",
            "VALIDATION_ERROR",
            400,
        )
    f = request.files.get("file")
    att, err = _persist_attachment_file(ticket_id, f)
    if err:
        db.session.rollback()
        return _error(err, "VALIDATION_ERROR", 400)
    db.session.commit()
    return {
        "id": att.id,
        "filename": att.filename,
        "file_size": att.file_size,
        "mime_type": att.mime_type,
    }, 201


