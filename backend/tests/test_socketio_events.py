"""Extra branches for WebSocket connect (token sources and failures)."""

from app.extensions import socketio


def _token(client, email="ws2@example.com"):
    r = client.post(
        "/api/auth/register",
        json={"name": "WS2", "email": email, "password": "password12"},
    )
    assert r.status_code == 201
    return r.get_json()["access_token"]


def test_connect_rejects_without_token(app, client):
    sio = socketio.test_client(app, flask_test_client=client)
    assert not sio.is_connected()


def test_connect_rejects_invalid_token(app, client):
    sio = socketio.test_client(
        app,
        auth={"token": "not-a-valid-jwt"},
        flask_test_client=client,
    )
    assert not sio.is_connected()


def test_connect_accepts_token_in_query_string(app, client):
    token = _token(client, email="ws_qs@example.com")
    sio = socketio.test_client(
        app,
        query_string=f"token={token}",
        flask_test_client=client,
    )
    assert sio.is_connected()
    sio.disconnect()


def test_connect_non_dict_auth_falls_back_to_query_string(app, client):
    """auth is not a dict → token stays None until query_string."""
    token = _token(client, email="ws_nd@example.com")
    sio = socketio.test_client(
        app,
        auth="not-a-dict",
        query_string=f"token={token}",
        flask_test_client=client,
    )
    assert sio.is_connected()
    sio.disconnect()
