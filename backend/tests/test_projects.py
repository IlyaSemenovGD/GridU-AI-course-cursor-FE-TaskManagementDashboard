"""Projects, members, and project-scoped tasks."""

from app.extensions import socketio


def _auth_headers(client, email="owner@example.com", name="Owner", password="password12"):
    r = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert r.status_code == 201
    token = r.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_projects(client):
    h = _auth_headers(client)
    r = client.post(
        "/api/projects",
        headers=h,
        json={"name": "Alpha", "description": "First project"},
    )
    assert r.status_code == 201
    data = r.get_json()
    assert data["name"] == "Alpha"
    pid = data["id"]

    r = client.get("/api/projects", headers=h)
    assert r.status_code == 200
    rows = r.get_json()
    assert len(rows) == 1
    assert rows[0]["id"] == pid


def test_add_member_and_collaborate_on_tasks(client):
    ho = _auth_headers(client, email="owner2@example.com", name="O")
    hm = _auth_headers(client, email="member2@example.com", name="M")

    r = client.post(
        "/api/projects",
        headers=ho,
        json={"name": "Team", "description": "Collaboration"},
    )
    pid = r.get_json()["id"]

    r = client.post(
        f"/api/projects/{pid}/members",
        headers=ho,
        json={"email": "member2@example.com"},
    )
    assert r.status_code == 201

    r = client.post(
        f"/api/projects/{pid}/tasks",
        headers=ho,
        json={
            "title": "Shared task",
            "description": "",
            "due_date": "2026-01-15",
            "priority": "medium",
            "assignee": "O",
        },
    )
    assert r.status_code == 201
    tid = r.get_json()["id"]

    r = client.get("/api/tasks", headers=hm)
    assert r.status_code == 200
    titles = [t["title"] for t in r.get_json()]
    assert "Shared task" in titles

    r = client.patch(
        f"/api/projects/{pid}/tasks/{tid}",
        headers=hm,
        json={"status": "done"},
    )
    assert r.status_code == 200
    assert r.get_json()["status"] == "done"


def test_member_receives_notification_on_task_create(client):
    ho = _auth_headers(client, email="pm_o@example.com")
    hm = _auth_headers(client, email="pm_m@example.com")

    r = client.post(
        "/api/projects",
        headers=ho,
        json={"name": "Notify", "description": ""},
    )
    pid = r.get_json()["id"]
    client.post(
        f"/api/projects/{pid}/members",
        headers=ho,
        json={"email": "pm_m@example.com"},
    )

    client.post(
        f"/api/projects/{pid}/tasks",
        headers=ho,
        json={
            "title": "Ping",
            "description": "",
            "due_date": "2026-02-01",
            "priority": "low",
            "assignee": "O",
        },
    )

    r = client.get("/api/notifications", headers=hm)
    assert r.status_code == 200
    notes = r.get_json()
    assert any(n["type"] == "task_created" for n in notes)


def test_socket_connects_with_jwt(app, client):
    r = client.post(
        "/api/auth/register",
        json={
            "name": "WS",
            "email": "ws@example.com",
            "password": "password12",
        },
    )
    token = r.get_json()["access_token"]
    sio = socketio.test_client(app, auth={"token": token}, flask_test_client=client)
    assert sio.is_connected()
    sio.disconnect()


def test_project_task_not_visible_via_personal_filter(client):
    """Personal task list includes project tasks for members (see task_access)."""
    h = _auth_headers(client, email="solo@example.com")
    r = client.post(
        "/api/projects",
        headers=h,
        json={"name": "SoloProj", "description": ""},
    )
    pid = r.get_json()["id"]
    client.post(
        f"/api/projects/{pid}/tasks",
        headers=h,
        json={
            "title": "In project",
            "description": "",
            "due_date": "2026-03-01",
            "priority": "high",
            "assignee": "Me",
        },
    )
    r = client.get("/api/tasks", headers=h)
    assert any(t["title"] == "In project" for t in r.get_json())
