def test_health_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.get_json()
    assert data == {"status": "ok"}


def test_root_redirects_to_apidocs(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (301, 302, 303, 307, 308)
    loc = r.headers.get("Location", "")
    assert "apidocs" in loc
