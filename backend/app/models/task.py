"""Task model (per-user tasks)."""

import uuid

from app.extensions import db


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    project_id = db.Column(
        db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True
    )
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    due_date = db.Column(db.String(32), nullable=False)
    priority = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    assignee = db.Column(db.String(120), nullable=False)

    user = db.relationship("User", backref=db.backref("tasks", lazy="dynamic"))
    project = db.relationship("Project", back_populates="tasks")
