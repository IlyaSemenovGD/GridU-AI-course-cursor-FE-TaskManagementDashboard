"""Centralized JSON error responses."""

from flask import current_app, jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException


def make_http_exception_response(exc: HTTPException):
    """Build (response, http_status) for a Werkzeug HTTPException."""
    if exc.code is None:
        return jsonify(message="Server error", code="error"), 500
    err_code = exc.name.lower().replace(" ", "_") if exc.name else "http_error"
    payload = {"message": exc.description or str(exc), "code": err_code}
    return jsonify(payload), exc.code


def register_error_handlers(app) -> None:
    @app.errorhandler(HTTPException)
    def handle_http(exc: HTTPException):
        return make_http_exception_response(exc)

    @app.errorhandler(ValidationError)
    def handle_validation(exc: ValidationError):
        return jsonify(errors=exc.messages, code="validation_error"), 400

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception):  # noqa: ANN401
        if current_app.config.get("TESTING"):
            raise
        app.logger.exception("Unhandled error: %s", exc)
        return jsonify(message="Internal server error", code="internal_error"), 500
