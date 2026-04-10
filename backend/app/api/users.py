"""User resource routes."""

from __future__ import annotations

from flasgger import swag_from
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, fields, validate

from app.extensions import db
from app.models.user import User, UserRole
from app.schemas.user_schema import user_schema
from app.services.ticket_access import get_user_or_404

bp = Blueprint("users", __name__)


class UserUpdateSchema(Schema):
    full_name = fields.String(validate=validate.Length(max=120))
    role = fields.String(
        validate=validate.OneOf([r.value for r in UserRole]), load_default=None
    )
    availability_status = fields.String(load_default=None)
    expertise_areas = fields.List(fields.String(), load_default=None)


user_update_schema = UserUpdateSchema()


@bp.route("", methods=["GET"])
@jwt_required()
@swag_from(
    {
        "tags": ["Users"],
        "summary": "List users (admin)",
        "security": [{"Bearer": []}],
        "responses": {200: {"description": "Users"}, 403: {"description": "Forbidden"}},
    }
)
def list_users():
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    if actor is None or actor.role != UserRole.ADMIN.value:
        return {"status": "error", "message": "Forbidden", "code": "FORBIDDEN"}, 403
    rows = User.query.order_by(User.id.asc()).all()
    return {"users": [user_schema.dump(u) for u in rows]}, 200


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


@bp.put("/<int:user_id>")
@jwt_required()
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Update user (admin or self for limited fields)",
        "security": [{"Bearer": []}],
    }
)
def update_user(user_id: int):
    uid = int(get_jwt_identity())
    actor = get_user_or_404(uid)
    target = get_user_or_404(user_id)
    if actor is None or target is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    if actor.id != target.id and actor.role != UserRole.ADMIN.value:
        return {"status": "error", "message": "Forbidden", "code": "FORBIDDEN"}, 403

    body = request.get_json(silent=True) or {}
    errs = user_update_schema.validate(body, partial=True)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = user_update_schema.load(body, partial=True)

    if "full_name" in data and data["full_name"] is not None:
        target.full_name = data["full_name"].strip()

    if actor.role == UserRole.ADMIN.value:
        if data.get("role") is not None:
            target.role = data["role"]
        if data.get("availability_status") is not None:
            target.availability_status = data["availability_status"]
        if data.get("expertise_areas") is not None:
            target.set_expertise_areas(data["expertise_areas"])
    else:
        # self: only non-privileged fields already applied (full_name)
        pass

    db.session.commit()
    return user_schema.dump(target), 200
