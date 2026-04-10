"""Notification inbox (REST). Real-time delivery uses WebSocket `notification` events."""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.notification import Notification
from app.schemas.notification_schema import notification_schema, notifications_schema

bp = Blueprint("notifications", __name__)


def _uid() -> int:
    return int(get_jwt_identity())


@bp.get("/notifications")
@jwt_required()
def list_notifications():
    uid = _uid()
    unread_only = request.args.get("unread_only", "").lower() in ("1", "true", "yes")
    q = Notification.query.filter_by(user_id=uid).order_by(Notification.created_at.desc())
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    limit = min(int(request.args.get("limit", 50)), 200)
    rows = q.limit(limit).all()
    return notifications_schema.dump(rows), 200


@bp.patch("/notifications/<int:notification_id>/read")
@jwt_required()
def mark_read(notification_id: int):
    uid = _uid()
    n = Notification.query.filter_by(id=notification_id, user_id=uid).first()
    if n is None:
        return {"message": "Notification not found"}, 404
    if n.read_at is None:
        from datetime import datetime, timezone

        n.read_at = datetime.now(timezone.utc)
        db.session.commit()
    return notification_schema.dump(n), 200


@bp.post("/notifications/read-all")
@jwt_required()
def mark_all_read():
    uid = _uid()
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    rows = (
        Notification.query.filter_by(user_id=uid)
        .filter(Notification.read_at.is_(None))
        .all()
    )
    for n in rows:
        n.read_at = now
    db.session.commit()
    return {"updated": True, "count": len(rows)}, 200
