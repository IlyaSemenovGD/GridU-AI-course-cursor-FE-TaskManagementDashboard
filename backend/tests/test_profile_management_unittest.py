"""
Unittest suite for user profile management (registration, profile, password, deletion).

Run:
  cd backend && python -m unittest tests.test_profile_management_unittest -v

Pytest also discovers these TestCase subclasses:
  pytest tests/test_profile_management_unittest.py -v
"""

from __future__ import annotations

import unittest

from app.models.user import User

from tests.fixtures import profile_mock_data as mock
from tests.profile_unittest_base import ProfileManagementTestCase


# --- Category: Registration ---


class TestRegistrationPositive(ProfileManagementTestCase):
    """Happy-path registration scenarios."""

    def test_register_returns_201_with_token_and_user_fields(self) -> None:
        r = self.client.post("/api/auth/register", json=mock.REGISTRATION_VALID)
        self.assertEqual(r.status_code, 201)
        data = r.get_json()
        self.assertIn("access_token", data)
        self.assertIn("id", data)
        self.assertEqual(data["email"], mock.REGISTRATION_VALID["email"])
        self.assertEqual(data["full_name"], mock.REGISTRATION_VALID["name"])

    def test_register_minimum_length_password_eight_chars(self) -> None:
        payload = mock.registration_payload(
            email="minlen@example.com",
            password=mock.MIN_LENGTH_PASSWORD,
        )
        r = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(r.status_code, 201)


class TestRegistrationNegative(ProfileManagementTestCase):
    """Validation and conflict errors."""

    def test_register_rejects_password_shorter_than_eight(self) -> None:
        r = self.client.post("/api/auth/register", json=mock.REGISTRATION_SHORT_PASSWORD)
        self.assertEqual(r.status_code, 400)

    def test_register_rejects_duplicate_email_with_409(self) -> None:
        p = mock.registration_payload(email="dup@example.com")
        self.assertEqual(self.client.post("/api/auth/register", json=p).status_code, 201)
        r2 = self.client.post("/api/auth/register", json=p)
        self.assertEqual(r2.status_code, 409)


class TestRegistrationSecurity(ProfileManagementTestCase):
    """Security expectations for registration responses."""

    def test_response_does_not_leak_password_or_hash(self) -> None:
        r = self.client.post("/api/auth/register", json=mock.REGISTRATION_SECURITY_USER)
        self.assertEqual(r.status_code, 201)
        data = r.get_json()
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)


# --- Category: Profile update ---


class TestProfileUpdatePositive(ProfileManagementTestCase):
    """Authenticated profile changes."""

    def test_update_full_name_and_email(self) -> None:
        h = self.register_and_headers(
            email="prof@example.com",
            name="Prof User",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.put(
            "/api/users/me",
            json=mock.profile_update_payload(
                full_name="Updated Name",
                email="newemail@example.com",
            ),
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        data = r.get_json()
        self.assertEqual(data["full_name"], "Updated Name")
        self.assertEqual(data["email"], "newemail@example.com")


class TestProfileUpdateNegative(ProfileManagementTestCase):
    """Auth and validation failures."""

    def test_put_me_without_token_returns_401(self) -> None:
        r = self.client.put(
            "/api/users/me",
            json=mock.profile_update_payload(full_name="Hacker"),
        )
        self.assertEqual(r.status_code, 401)

    def test_empty_body_returns_400(self) -> None:
        h = self.register_and_headers(
            email="empty@example.com",
            name="Empty",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.put("/api/users/me", json={}, headers=h)
        self.assertEqual(r.status_code, 400)

    def test_email_already_taken_returns_409(self) -> None:
        self.register_and_headers(
            email="other409@example.com",
            name="Other",
            password=mock.VALID_PASSWORD,
        )
        h_owner = self.register_and_headers(
            email="owner409@example.com",
            name="Owner",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.put(
            "/api/users/me",
            json=mock.profile_update_payload(email="other409@example.com"),
            headers=h_owner,
        )
        self.assertEqual(r.status_code, 409)
        msg = (r.get_json() or {}).get("message", "")
        self.assertTrue(
            "already" in msg.lower() or "registered" in msg.lower(),
            msg=msg,
        )


# --- Category: Password change ---


class TestPasswordChange(ProfileManagementTestCase):
    """Password rotation via POST /api/users/me/password."""

    def test_wrong_current_password_returns_401(self) -> None:
        h = self.register_and_headers(
            email="pwd@example.com",
            name="Pwd",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.post(
            "/api/users/me/password",
            json=mock.change_password_payload(
                mock.WRONG_PASSWORD,
                mock.NEW_PASSWORD_AFTER_CHANGE,
            ),
            headers=h,
        )
        self.assertEqual(r.status_code, 401)

    def test_success_updates_hash(self) -> None:
        h = self.register_and_headers(
            email="pwd2@example.com",
            name="Pwd",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.post(
            "/api/users/me/password",
            json=mock.change_password_payload(
                mock.VALID_PASSWORD,
                mock.NEW_PASSWORD_AFTER_CHANGE,
            ),
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        with self.app.app_context():
            u = User.query.filter_by(email="pwd2@example.com").first()
            self.assertIsNotNone(u)
            self.assertTrue(u.check_password(mock.NEW_PASSWORD_AFTER_CHANGE))

    def test_new_password_too_short_returns_400(self) -> None:
        h = self.register_and_headers(
            email="pwlen@example.com",
            name="Pw",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.post(
            "/api/users/me/password",
            json=mock.change_password_payload(mock.VALID_PASSWORD, "seven77"),
            headers=h,
        )
        self.assertEqual(r.status_code, 400)


# --- Category: Account deletion ---


class TestAccountDeletion(ProfileManagementTestCase):
    """DELETE /api/users/me with password confirmation."""

    def test_wrong_password_returns_401(self) -> None:
        h = self.register_and_headers(
            email="del@example.com",
            name="Del",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.delete(
            "/api/users/me",
            json=mock.delete_account_payload(mock.WRONG_PASSWORD),
            headers=h,
        )
        self.assertEqual(r.status_code, 401)

    def test_correct_password_returns_204_and_removes_user(self) -> None:
        h = self.register_and_headers(
            email="del2@example.com",
            name="Del",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.delete(
            "/api/users/me",
            json=mock.delete_account_payload(mock.VALID_PASSWORD),
            headers=h,
        )
        self.assertEqual(r.status_code, 204)
        with self.app.app_context():
            self.assertIsNone(User.query.filter_by(email="del2@example.com").first())

    def test_missing_password_returns_400(self) -> None:
        h = self.register_and_headers(
            email="nopw@example.com",
            name="N",
            password=mock.VALID_PASSWORD,
        )
        r = self.client.delete("/api/users/me", json={}, headers=h)
        self.assertEqual(r.status_code, 400)


if __name__ == "__main__":
    unittest.main()
