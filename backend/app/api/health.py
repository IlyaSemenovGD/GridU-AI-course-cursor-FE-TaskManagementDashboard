"""Health check endpoint."""

from flasgger import swag_from
from flask import Blueprint, jsonify, redirect

from app.extensions import limiter

bp = Blueprint("health", __name__)


@bp.get("/")
@limiter.exempt
def root():
    """Serve something at / so the dev server is not a bare 404."""
    return redirect("/apidocs/")


@bp.get("/health")
@limiter.exempt
@swag_from(
    {
        "tags": ["Health"],
        "summary": "Liveness probe",
        "responses": {200: {"description": "OK"}},
    }
)
def health():
    return jsonify(status="ok"), 200
