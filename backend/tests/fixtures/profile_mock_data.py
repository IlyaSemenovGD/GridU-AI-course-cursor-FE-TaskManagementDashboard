"""
Mock data and payload builders for user profile / auth tests.

Used by unittest and pytest modules; keep values aligned with
docs/user-profile-management-test-cases.md (TD-* identifiers).
"""

from __future__ import annotations

from typing import Any

# Passwords (schema: min 8 characters)
VALID_PASSWORD = "password12"
MIN_LENGTH_PASSWORD = "12345678"  # exactly 8 chars
SHORT_PASSWORD = "short"
NEW_PASSWORD_STRONG = "Str0ng!New99"
NEW_PASSWORD_AFTER_CHANGE = "newpassword99"
WRONG_PASSWORD = "wrongguess"

# Registration payloads
REGISTRATION_VALID: dict[str, Any] = {
    "name": "Alice Tester",
    "email": "alice.valid@example.com",
    "password": VALID_PASSWORD,
}

REGISTRATION_SHORT_PASSWORD: dict[str, Any] = {
    "name": "X",
    "email": "short@example.com",
    "password": SHORT_PASSWORD,
}

REGISTRATION_SECURITY_USER: dict[str, Any] = {
    "name": "Security User",
    "email": "secuser@example.com",
    "password": VALID_PASSWORD,
}


def registration_payload(
    *,
    name: str = "Test User",
    email: str,
    password: str = VALID_PASSWORD,
) -> dict[str, Any]:
    """Build a register body with a unique email per test."""
    return {"name": name, "email": email, "password": password}


def change_password_payload(
    current_password: str,
    new_password: str,
) -> dict[str, Any]:
    return {
        "current_password": current_password,
        "new_password": new_password,
    }


def delete_account_payload(password: str) -> dict[str, Any]:
    return {"password": password}


def profile_update_payload(
    *,
    full_name: str | None = None,
    email: str | None = None,
) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if full_name is not None:
        out["full_name"] = full_name
    if email is not None:
        out["email"] = email
    return out
