def test_register_returns_201_and_token(client):
    r = client.post(
        "/api/auth/register",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "password": "password12",
        },
    )
    assert r.status_code == 201
    data = r.get_json()
    assert "access_token" in data
    assert data["email"] == "ada@example.com"
    assert data["full_name"] == "Ada Lovelace"
    assert "id" in data


def test_register_duplicate_email_returns_409(client):
    body = {"name": "A", "email": "dup@example.com", "password": "password12"}
    assert client.post("/api/auth/register", json=body).status_code == 201
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 409
    assert "already exists" in r.get_json()["message"]


def test_register_validation_error_returns_400(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "", "email": "not-an-email", "password": "short"},
    )
    assert r.status_code == 400
    assert "errors" in r.get_json()


def test_login_returns_token(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "Bob",
            "email": "bob@example.com",
            "password": "secretpass1",
        },
    )
    r = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "secretpass1"},
    )
    assert r.status_code == 200
    assert "access_token" in r.get_json()


def test_login_wrong_password_returns_401(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "Carol",
            "email": "carol@example.com",
            "password": "rightpass1",
        },
    )
    r = client.post(
        "/api/auth/login",
        json={"email": "carol@example.com", "password": "wrongpassword"},
    )
    assert r.status_code == 401
    assert "Incorrect password" in r.get_json()["message"]


def test_login_unknown_email_returns_401(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "anypass1234"},
    )
    assert r.status_code == 401
    assert "No account found" in r.get_json()["message"]


def test_login_missing_body_returns_400(client):
    r = client.post("/api/auth/login", json={"email": "x@y.com"})
    assert r.status_code == 400


def test_login_unknown_username_returns_401(client):
    r = client.post(
        "/api/auth/login",
        json={"username": "no_such_username_xyz", "password": "password12"},
    )
    assert r.status_code == 401
    assert r.get_json()["message"] == "No account found."


def test_login_with_username_succeeds(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "Dan",
            "email": "dan@example.com",
            "password": "password12",
        },
    )
    assert reg.status_code == 201
    username = reg.get_json()["username"]
    r = client.post(
        "/api/auth/login",
        json={"username": username, "password": "password12"},
    )
    assert r.status_code == 200
    assert "access_token" in r.get_json()


def test_register_reuses_local_part_allocates_suffix_username(client):
    assert (
        client.post(
            "/api/auth/register",
            json={
                "name": "First",
                "email": "same@first.com",
                "password": "password12",
            },
        ).status_code
        == 201
    )
    r = client.post(
        "/api/auth/register",
        json={
            "name": "Second",
            "email": "same@second.com",
            "password": "password12",
        },
    )
    assert r.status_code == 201
    assert r.get_json()["username"] == "same_1"
