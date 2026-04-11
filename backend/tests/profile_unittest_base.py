"""
Base TestCase for profile-management tests: isolated DB per test.

Provides:
  - setUp: testing app, app context, drop/create tables, Flask test client
  - tearDown: session cleanup, drop tables, pop context
  - register_and_headers(): register user and return Authorization headers
"""

from __future__ import annotations

import unittest

from app import create_app
from app.extensions import db


class ProfileManagementTestCase(unittest.TestCase):
    """Fresh SQLite schema + client for each test method."""

    app = None
    client = None
    _ctx = None

    def setUp(self) -> None:
        self.app = create_app("testing")
        self._ctx = self.app.app_context()
        self._ctx.push()
        db.drop_all()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        if self._ctx is not None:
            self._ctx.pop()
            self._ctx = None
        self.client = None
        self.app = None

    def register_and_headers(
        self,
        *,
        name: str = "Test User",
        email: str,
        password: str,
    ) -> dict[str, str]:
        """POST /api/auth/register and return Bearer headers."""
        r = self.client.post(
            "/api/auth/register",
            json={"name": name, "email": email, "password": password},
        )
        self.assertEqual(
            r.status_code,
            201,
            msg=f"register failed: {r.get_data(as_text=True)}",
        )
        token = r.get_json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
