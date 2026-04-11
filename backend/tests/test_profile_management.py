"""User profile, password change, and account deletion."""

from app.models.user import User


def test_update_profile_name_and_email(client, auth_headers):
    headers = auth_headers(email="prof@example.com", name="Prof User", password="password12")
    r = client.put(
        "/api/users/me",
        json={"full_name": "Updated Name", "email": "newemail@example.com"},
        headers=headers,
    )
    assert r.status_code == 200, r.get_data(as_text=True)
    data = r.get_json()
    assert data["full_name"] == "Updated Name"
    assert data["email"] == "newemail@example.com"


def test_update_profile_requires_field(client, auth_headers):
    headers = auth_headers(email="empty@example.com", name="Empty", password="password12")
    r = client.put("/api/users/me", json={}, headers=headers)
    assert r.status_code == 400


def test_change_password(client, auth_headers):
    headers = auth_headers(email="pwd@example.com", name="Pwd", password="password12")
    r = client.post(
        "/api/users/me/password",
        json={"current_password": "wrong", "new_password": "newpassword99"},
        headers=headers,
    )
    assert r.status_code == 401

    r2 = client.post(
        "/api/users/me/password",
        json={"current_password": "password12", "new_password": "newpassword99"},
        headers=headers,
    )
    assert r2.status_code == 200, r2.get_data(as_text=True)

    with client.application.app_context():
        u = User.query.filter_by(email="pwd@example.com").first()
        assert u is not None
        assert u.check_password("newpassword99")


def test_delete_account_requires_password(client, auth_headers):
    headers = auth_headers(email="del@example.com", name="Del", password="password12")
    r = client.delete("/api/users/me", json={"password": "wrong"}, headers=headers)
    assert r.status_code == 401

    r2 = client.delete("/api/users/me", json={"password": "password12"}, headers=headers)
    assert r2.status_code == 204

    with client.application.app_context():
        assert User.query.filter_by(email="del@example.com").first() is None


def test_register_rejects_short_password(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "X", "email": "short@example.com", "password": "short"},
    )
    assert r.status_code == 400


def test_put_me_requires_auth(client):
    r = client.put("/api/users/me", json={"full_name": "Hacker"})
    assert r.status_code == 401


def test_profile_email_conflict_returns_409(client, auth_headers):
    auth_headers(email="other409@example.com", name="Other", password="password12")
    h_owner = auth_headers(email="owner409@example.com", name="Owner", password="password12")
    r = client.put(
        "/api/users/me",
        json={"email": "other409@example.com"},
        headers=h_owner,
    )
    assert r.status_code == 409
    msg = (r.get_json() or {}).get("message", "")
    assert "already" in msg.lower() or "registered" in msg.lower()


def test_password_change_new_password_too_short(client, auth_headers):
    headers = auth_headers(
        email="pwlen@example.com",
        name="Pw",
        password="password12",
    )
    r = client.post(
        "/api/users/me/password",
        json={"current_password": "password12", "new_password": "seven77"},
        headers=headers,
    )
    assert r.status_code == 400


def test_delete_account_missing_password_returns_400(client, auth_headers):
    headers = auth_headers(email="nopw@example.com", name="N", password="password12")
    r = client.delete("/api/users/me", json={}, headers=headers)
    assert r.status_code == 400


def test_register_success_response_excludes_password_fields(client):
    r = client.post(
        "/api/auth/register",
        json={
            "name": "Security User",
            "email": "secuser@example.com",
            "password": "password12",
        },
    )
    assert r.status_code == 201
    data = r.get_json()
    assert "password" not in data
    assert "password_hash" not in data
    assert data.get("email") == "secuser@example.com"
