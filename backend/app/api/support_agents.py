"""Agents listing and workload (PRD §6.3)."""

from __future__ import annotations

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.extensions import db
from app.models.support import SupportTicket
from app.models.user import AgentAvailability, User, UserRole
from app.schemas.support_schema import ticket_dump_schema
from app.services.ticket_access import get_user_or_404

bp = Blueprint("support_agents", __name__)


def _current_user() -> User | None:
    uid = get_jwt_identity()
    if uid is None:
        return None
    return get_user_or_404(int(uid))


def _error(message: str, code: str, status: int):
    return {"status": "error", "message": message, "code": code}, status


@bp.get("/agents")
@jwt_required()
def list_agents():
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    if user.role not in (UserRole.ADMIN.value, UserRole.AGENT.value):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    agents = User.query.filter(User.role == UserRole.AGENT.value).order_by(User.username).all()
    out = []
    for a in agents:
        out.append(
            {
                "id": a.id,
                "username": a.username,
                "full_name": a.full_name,
                "email": a.email,
                "role": a.role,
                "availability_status": a.availability_status,
                "expertise_areas": a.expertise_areas_list(),
            }
        )
    return {"agents": out}, 200


@bp.get("/agents/<int:agent_id>/tickets")
@jwt_required()
def agent_tickets(agent_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    agent = get_user_or_404(agent_id)
    if agent is None or agent.role != UserRole.AGENT.value:
        return _error("Agent not found.", "NOT_FOUND", 404)
    if user.role == UserRole.AGENT.value and user.id != agent_id:
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    if user.role == UserRole.CUSTOMER.value:
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    rows = (
        SupportTicket.query.filter(SupportTicket.assigned_to_id == agent_id)
        .order_by(SupportTicket.updated_at.desc())
        .all()
    )
    return {"tickets": [ticket_dump_schema.dump(t) for t in rows]}, 200


@bp.put("/agents/<int:agent_id>/availability")
@jwt_required()
def update_availability(agent_id: int):
    user = _current_user()
    if user is None:
        return _error("User not found.", "NOT_FOUND", 404)
    agent = get_user_or_404(agent_id)
    if agent is None or agent.role != UserRole.AGENT.value:
        return _error("Agent not found.", "NOT_FOUND", 404)
    if user.role == UserRole.AGENT.value and user.id != agent_id:
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    if user.role not in (UserRole.AGENT.value, UserRole.ADMIN.value):
        return _error("Insufficient permissions.", "FORBIDDEN", 403)
    from flask import request

    body = request.get_json(silent=True) or {}
    status = (body.get("availability_status") or "").strip()
    if status not in {a.value for a in AgentAvailability}:
        return _error(
            "Invalid availability_status.",
            "VALIDATION_ERROR",
            400,
        )
    agent.availability_status = status
    db.session.commit()
    return {
        "id": agent.id,
        "availability_status": agent.availability_status,
    }, 200
