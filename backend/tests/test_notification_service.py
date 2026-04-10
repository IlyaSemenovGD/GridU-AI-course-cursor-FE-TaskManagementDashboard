"""Tests for notification_service edge cases."""

from unittest.mock import patch

from app.extensions import db
from app.models.user import User
from app.services.notification_service import create_and_emit, notify_project_except


def _make_user(app):
    with app.app_context():
        u = User(
            username="ns_user",
            email="ns@example.com",
            full_name="N",
            password_hash="x",
        )
        u.set_password("password12")
        db.session.add(u)
        db.session.commit()
        return u.id


def test_notify_project_except_no_members_early_return(app):
    """Covers branch when project has no member rows (e.g. bogus id)."""
    with app.app_context():
        notify_project_except(
            999_999,
            event_type="x",
            title="y",
        )


def test_create_and_emit_swallows_runtime_error_from_socket(app):
    """Covers except RuntimeError around socketio.emit."""
    uid = _make_user(app)
    with app.app_context():
        with patch(
            "app.extensions.socketio.emit",
            side_effect=RuntimeError("test: no broadcast context"),
        ):
            out = create_and_emit(
                [uid],
                event_type="t",
                title="hello",
            )
        assert len(out) == 1
