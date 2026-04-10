def test_list_tasks_requires_auth(client):
    r = client.get("/api/tasks")
    assert r.status_code == 401


def test_tasks_crud_flow(client, auth_headers):
    headers = auth_headers(email="tasks@example.com")

    r = client.get("/api/tasks", headers=headers)
    assert r.status_code == 200
    assert r.get_json() == []

    r = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "title": "Write tests",
            "description": "Cover API",
            "due_date": "2026-12-31",
            "priority": "high",
            "assignee": "Me",
        },
    )
    assert r.status_code == 201
    created = r.get_json()
    task_id = created["id"]
    assert created["title"] == "Write tests"
    assert created["status"] == "todo"

    r = client.get("/api/tasks", headers=headers)
    assert r.status_code == 200
    assert len(r.get_json()) == 1

    r = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        json={"status": "done"},
    )
    assert r.status_code == 200
    assert r.get_json()["status"] == "done"

    r = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert r.status_code == 204

    r = client.get("/api/tasks", headers=headers)
    assert r.get_json() == []


def test_update_unknown_task_returns_404(client, auth_headers):
    headers = auth_headers()
    r = client.patch(
        "/api/tasks/00000000-0000-0000-0000-000000000000",
        headers=headers,
        json={"status": "done"},
    )
    assert r.status_code == 404


def test_create_task_validation_error_returns_400(client, auth_headers):
    headers = auth_headers()
    r = client.post("/api/tasks", headers=headers, json={})
    assert r.status_code == 400
    assert "errors" in r.get_json()


def test_update_task_validation_error_returns_400(client, auth_headers):
    headers = auth_headers(email="patcherr@example.com")
    r = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "title": "T",
            "description": "",
            "due_date": "2026-06-01",
            "priority": "low",
            "assignee": "Me",
        },
    )
    task_id = r.get_json()["id"]
    r = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        json={"status": "not-a-valid-status"},
    )
    assert r.status_code == 400
    assert "errors" in r.get_json()


def test_delete_unknown_task_returns_404(client, auth_headers):
    headers = auth_headers()
    r = client.delete(
        "/api/tasks/00000000-0000-0000-0000-000000000099",
        headers=headers,
    )
    assert r.status_code == 404
    assert r.get_json()["message"] == "Task not found"


def test_cannot_modify_other_users_task(client, auth_headers):
    h1 = auth_headers(email="user1@example.com", name="One")
    h2 = auth_headers(email="user2@example.com", name="Two")

    r = client.post(
        "/api/tasks",
        headers=h1,
        json={
            "title": "Private",
            "description": "",
            "due_date": "2026-01-01",
            "priority": "low",
            "assignee": "One",
        },
    )
    task_id = r.get_json()["id"]

    r = client.patch(
        f"/api/tasks/{task_id}",
        headers=h2,
        json={"status": "done"},
    )
    assert r.status_code == 404
