def test_me_requires_auth(client):
    r = client.get("/api/users/me")
    assert r.status_code == 401


def test_me_returns_profile(client, auth_headers):
    headers = auth_headers(
        email="me@example.com",
        name="Me User",
        password="password12",
    )
    r = client.get("/api/users/me", headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert data["email"] == "me@example.com"
    assert data["full_name"] == "Me User"
    assert "username" in data


def test_me_returns_404_when_user_deleted(client, app, auth_headers):
    headers = auth_headers(
        email="deleted@example.com",
        name="Deleted",
        password="password12",
    )
    from app.extensions import db
    from app.models.user import User

    with app.app_context():
        u = User.query.filter_by(email="deleted@example.com").first()
        assert u is not None
        db.session.delete(u)
        db.session.commit()

    r = client.get("/api/users/me", headers=headers)
    assert r.status_code == 404
    assert r.get_json()["message"] == "User not found"
