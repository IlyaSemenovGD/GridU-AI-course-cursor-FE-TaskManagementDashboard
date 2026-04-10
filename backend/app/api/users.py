"""User resource routes (JWT-protected example)."""

from flasgger import swag_from
from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User
from app.schemas.user_schema import user_schema

bp = Blueprint("users", __name__)


@bp.get("/me")
@jwt_required()
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Current user profile",
        "security": [{"Bearer": []}],
        "responses": {
            200: {"description": "Profile"},
            401: {"description": "Missing or invalid token"},
            404: {"description": "User not found"},
        },
    }
)
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return {"message": "User not found"}, 404
    return user_schema.dump(user), 200
