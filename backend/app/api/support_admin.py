"""Admin dashboard and reports (PRD §6.4)."""

from __future__ import annotations

import csv
import io

from flask import Blueprint, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.support import SupportTicket, TicketStatus
from app.models.user import User, UserRole
from app.services.ticket_access import get_user_or_404, require_admin

bp = Blueprint("support_admin", __name__)


def _current_user() -> User | None:
    uid = get_jwt_identity()
    if uid is None:
        return None
    return get_user_or_404(int(uid))


def _error(message: str, code: str, status: int):
    return {"status": "error", "message": message, "code": code}, status


def _dashboard_metrics() -> dict:
    total = SupportTicket.query.count()
    by_status = dict(
        db.session.query(SupportTicket.status, func.count(SupportTicket.id))
        .group_by(SupportTicket.status)
        .all()
    )
    by_priority = dict(
        db.session.query(SupportTicket.priority, func.count(SupportTicket.id))
        .group_by(SupportTicket.priority)
        .all()
    )
    by_category = dict(
        db.session.query(SupportTicket.category, func.count(SupportTicket.id))
        .group_by(SupportTicket.category)
        .all()
    )

    resolved = SupportTicket.query.filter(
        SupportTicket.resolved_at.isnot(None)
    ).all()
    resolution_seconds: list[float] = []
    for t in resolved:
        if t.created_at and t.resolved_at:
            resolution_seconds.append(
                (t.resolved_at - t.created_at).total_seconds()
            )
    avg_resolution_hours = (
        sum(resolution_seconds) / len(resolution_seconds) / 3600.0
        if resolution_seconds
        else None
    )

    sla_met = SupportTicket.query.filter(
        SupportTicket.resolved_at.isnot(None),
        SupportTicket.resolution_due_at.isnot(None),
        SupportTicket.resolved_at <= SupportTicket.resolution_due_at,
    ).count()
    sla_total = SupportTicket.query.filter(
        SupportTicket.resolved_at.isnot(None)
    ).count()
    sla_rate = (sla_met / sla_total) if sla_total else None

    agents = User.query.filter(User.role == UserRole.AGENT.value).all()
    agent_stats = []
    for a in agents:
        assigned = SupportTicket.query.filter(
            SupportTicket.assigned_to_id == a.id
        ).count()
        closed = SupportTicket.query.filter(
            SupportTicket.assigned_to_id == a.id,
            SupportTicket.status == TicketStatus.CLOSED.value,
        ).count()
        agent_stats.append(
            {
                "agent_id": a.id,
                "username": a.username,
                "tickets_assigned_total": assigned,
                "tickets_closed": closed,
            }
        )

    return {
        "total_tickets": total,
        "tickets_by_status": by_status,
        "tickets_by_priority": by_priority,
        "tickets_by_category": by_category,
        "average_resolution_hours": avg_resolution_hours,
        "sla_compliance_rate": sla_rate,
        "agent_performance": agent_stats,
    }


@bp.get("/admin/dashboard")
@jwt_required()
def admin_dashboard():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    return _dashboard_metrics(), 200


@bp.get("/admin/reports/tickets")
@jwt_required()
def report_tickets():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    period = request.args.get("period", "month")
    rows = (
        SupportTicket.query.order_by(SupportTicket.created_at.desc()).limit(500).all()
    )
    from app.schemas.support_schema import ticket_dump_schema

    return {
        "period": period,
        "sample": [ticket_dump_schema.dump(t) for t in rows[:50]],
        "total_in_sample": len(rows),
    }, 200


@bp.get("/admin/reports/agents")
@jwt_required()
def report_agents():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    return {"agent_performance": _dashboard_metrics()["agent_performance"]}, 200


@bp.get("/admin/reports/sla")
@jwt_required()
def report_sla():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    m = _dashboard_metrics()
    breached = SupportTicket.query.filter(
        SupportTicket.sla_resolution_breached.is_(True)
    ).count()
    return {
        "sla_compliance_rate": m.get("sla_compliance_rate"),
        "breached_ticket_count": breached,
    }, 200


@bp.post("/admin/reports/export")
@jwt_required()
def export_report():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if not require_admin(user):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    body = request.get_json(silent=True) or {}
    fmt = (body.get("format") or "csv").lower()
    if fmt != "csv":
        return _error("Only CSV export is implemented.", "VALIDATION_ERROR", 400)

    q = SupportTicket.query.order_by(SupportTicket.created_at.desc())
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "ticket_number",
            "subject",
            "status",
            "priority",
            "category",
            "customer_email",
            "assigned_to_id",
            "created_at",
            "resolved_at",
        ]
    )
    for t in q:
        w.writerow(
            [
                t.ticket_number,
                t.subject,
                t.status,
                t.priority,
                t.category,
                t.customer_email,
                t.assigned_to_id or "",
                t.created_at.isoformat() if t.created_at else "",
                t.resolved_at.isoformat() if t.resolved_at else "",
            ]
        )
    buf.seek(0)
    return send_file(
        io.BytesIO(buf.getvalue().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="support_tickets_export.csv",
    )
