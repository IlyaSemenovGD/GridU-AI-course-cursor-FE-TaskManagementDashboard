"""Coverage for app.utils.errors handlers."""

import pytest
from werkzeug.exceptions import HTTPException, NotFound

from app.utils.errors import make_http_exception_response
from marshmallow import ValidationError


def test_http_exception_handler_not_found(client):
    r = client.get("/this-route-does-not-exist-404-test")
    assert r.status_code == 404
    data = r.get_json()
    assert "message" in data
    assert "code" in data


def test_make_http_exception_response_none_code(app):
    """Branch when Werkzeug HTTPException has no HTTP status (defensive)."""
    exc = HTTPException()
    exc.code = None
    exc.description = "edge"
    with app.app_context():
        rv, status = make_http_exception_response(exc)
        assert status == 500
        assert rv.get_json() == {"message": "Server error", "code": "error"}


def test_make_http_exception_response_not_found(app):
    with app.app_context():
        rv, status = make_http_exception_response(NotFound())
        assert status == 404
        data = rv.get_json()
        assert data["code"] == "not_found"


def test_validation_error_handler(app):
    @app.get("/__pytest__/validation")
    def _raise_validation():
        raise ValidationError({"field": ["invalid"]})

    r = app.test_client().get("/__pytest__/validation")
    assert r.status_code == 400
    data = r.get_json()
    assert data.get("code") == "VALIDATION_ERROR"
    assert "errors" in data


def test_unhandled_exception_returns_json_when_not_testing():
    from app import create_app

    app = create_app("development")

    @app.get("/__pytest__/runtime_boom")
    def _boom():
        raise RuntimeError("deliberate")

    r = app.test_client().get("/__pytest__/runtime_boom")
    assert r.status_code == 500
    data = r.get_json()
    assert data.get("code") == "INTERNAL_ERROR"
    assert "message" in data


def test_unhandled_exception_re_raises_while_testing(app):
    """handle_unexpected propagates in TESTING mode (line 24)."""

    @app.get("/__pytest__/runtime_in_testing")
    def _boom():
        raise RuntimeError("deliberate testing")

    with pytest.raises(RuntimeError, match="deliberate testing"):
        app.test_client().get("/__pytest__/runtime_in_testing")
