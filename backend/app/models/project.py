"""Project and team membership."""

from datetime import datetime, timezone

from app.extensions import db


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    archived = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = db.relationship("User", foreign_keys=[owner_id], backref="owned_projects")
    members = db.relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    tasks = db.relationship(
        "Task",
        back_populates="project",
        foreign_keys="Task.project_id",
    )


class ProjectMember(db.Model):
    __tablename__ = "project_members"

    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    role = db.Column(db.String(20), nullable=False, default="member")
    joined_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    project = db.relationship("Project", back_populates="members")
    user = db.relationship("User", backref="project_memberships")
