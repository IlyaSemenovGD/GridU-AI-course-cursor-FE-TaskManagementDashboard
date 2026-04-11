"""Centralized JSON error responses."""

from flask import current_app, jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

try:
    from flask_limiter.errors import RateLimitExceeded
except ImportError:
    RateLimitExceeded = None  # type: ignore[misc, assignment]


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
        return (
            jsonify(
                status="error",
                message="Validation failed",
                code="VALIDATION_ERROR",
                errors=exc.messages,
            ),
            400,
        )

    if RateLimitExceeded is not None:

        @app.errorhandler(RateLimitExceeded)
        def handle_rate_limit(_exc: RateLimitExceeded):
            return (
                jsonify(
                    status="error",
                    message="Too many requests",
                    code="RATE_LIMIT_EXCEEDED",
                ),
                429,
            )

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception):  # noqa: ANN401
        if current_app.config.get("TESTING"):
            raise exc
        app.logger.exception("Unhandled error: %s", exc)
        return (
            jsonify(
                status="error",
                message="Internal server error",
                code="INTERNAL_ERROR",
            ),
            500,
        )
