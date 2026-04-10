"""Shared pytest fixtures for the Flask API."""

import pytest

from app import create_app
from app.extensions import db


@pytest.fixture
def app():
    """Fresh tables for each test."""
    application = create_app("testing")
    with application.app_context():
        db.drop_all()
        db.create_all()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Register a user and return Authorization headers."""

    def _register(
        *,
        name: str = "Test User",
        email: str = "testuser@example.com",
        password: str = "password12",
    ) -> dict[str, str]:
        r = client.post(
            "/api/auth/register",
            json={"name": name, "email": email, "password": password},
        )
        assert r.status_code == 201, r.get_data(as_text=True)
        token = r.get_json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _register
