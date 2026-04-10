"""In-app notifications (also pushed over WebSocket)."""

from datetime import datetime, timezone

from app.extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    body = db.Column(db.Text, nullable=False, default="")
    entity_type = db.Column(db.String(40), nullable=True)
    entity_id = db.Column(db.String(64), nullable=True)
    read_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = db.relationship("User", backref=db.backref("notifications", lazy="dynamic"))
