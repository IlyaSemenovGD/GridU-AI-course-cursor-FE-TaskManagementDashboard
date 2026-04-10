"""User model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum

import bcrypt
from werkzeug.security import check_password_hash as werkzeug_check_password

from app.extensions import db


class UserRole(str, Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    ADMIN = "admin"


class AgentAvailability(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


BCRYPT_ROUNDS = 12


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False, default="")
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(
        db.String(20), nullable=False, default=UserRole.CUSTOMER.value, index=True
    )
    availability_status = db.Column(db.String(20), nullable=True)
    expertise_areas = db.Column(db.Text, nullable=False, default="[]")
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
        ).decode("utf-8")

    def check_password(self, password: str) -> bool:
        stored = self.password_hash
        if stored.startswith("$2"):
            return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
        return werkzeug_check_password(stored, password)

    def expertise_areas_list(self) -> list[str]:
        try:
            data = json.loads(self.expertise_areas or "[]")
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []

    def set_expertise_areas(self, areas: list[str]) -> None:
        self.expertise_areas = json.dumps(areas)
