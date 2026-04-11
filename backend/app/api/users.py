"""User resource routes."""

from __future__ import annotations

from flasgger import swag_from
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy import func

from app.extensions import db
from app.models.user import User, UserRole
from app.schemas.user_schema import (
    account_delete_schema,
    password_change_schema,
    profile_self_update_schema,
    user_schema,
)
from app.services.ticket_access import get_user_or_404
from app.services.user_account import purge_user_account
from app.utils.support_validation import normalize_email_rfc5322

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


@bp.put("/me")
@jwt_required()
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Update current user profile (name and/or email)",
        "security": [{"Bearer": []}],
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "schema": {
                    "type": "object",
                    "properties": {
                        "full_name": {"type": "string"},
                        "email": {"type": "string", "format": "email"},
                    },
                },
            }
        ],
        "responses": {
            200: {"description": "Updated profile"},
            400: {"description": "Validation error"},
            409: {"description": "Email already in use"},
        },
    }
)
def update_me():
    user_id = int(get_jwt_identity())
    actor = get_user_or_404(user_id)
    if actor is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    errs = profile_self_update_schema.validate(body, partial=True)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = profile_self_update_schema.load(body, partial=True)
    if data.get("full_name") is None and data.get("email") is None:
        return (
            {
                "status": "error",
                "message": "Provide full_name and/or email to update.",
                "code": "VALIDATION_ERROR",
            },
            400,
        )
    if data.get("full_name") is not None:
        actor.full_name = data["full_name"].strip()
    if data.get("email") is not None:
        try:
            email_norm = normalize_email_rfc5322(data["email"])
        except ValidationError as exc:
            return (
                {
                    "status": "error",
                    "message": exc.args[0] if exc.args else "Invalid email",
                    "code": "VALIDATION_ERROR",
                },
                400,
            )
        taken = User.query.filter(
            func.lower(User.email) == email_norm.lower(),
            User.id != actor.id,
        ).first()
        if taken:
            return (
                {
                    "status": "error",
                    "message": "That email is already registered.",
                    "code": "CONFLICT",
                },
                409,
            )
        actor.email = email_norm
    db.session.commit()
    return user_schema.dump(actor), 200


@bp.post("/me/password")
@jwt_required()
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Change password (requires current password)",
        "security": [{"Bearer": []}],
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "required": ["current_password", "new_password"],
                    "properties": {
                        "current_password": {"type": "string"},
                        "new_password": {"type": "string", "minLength": 8},
                    },
                },
            }
        ],
        "responses": {
            200: {"description": "Password changed"},
            400: {"description": "Validation error"},
            401: {"description": "Current password incorrect"},
        },
    }
)
def change_my_password():
    user_id = int(get_jwt_identity())
    user = get_user_or_404(user_id)
    if user is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    errs = password_change_schema.validate(body)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = password_change_schema.load(body)
    if not user.check_password(data["current_password"]):
        return (
            {
                "status": "error",
                "message": "Current password is incorrect.",
                "code": "UNAUTHORIZED",
            },
            401,
        )
    user.set_password(data["new_password"])
    db.session.commit()
    return {"status": "ok", "message": "Password updated successfully."}, 200


@bp.delete("/me")
@jwt_required()
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Delete own account (requires password)",
        "security": [{"Bearer": []}],
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "required": ["password"],
                    "properties": {"password": {"type": "string"}},
                },
            }
        ],
        "responses": {
            204: {"description": "Account deleted"},
            401: {"description": "Password incorrect"},
        },
    }
)
def delete_me():
    user_id = int(get_jwt_identity())
    user = get_user_or_404(user_id)
    if user is None:
        return {"status": "error", "message": "Not found", "code": "NOT_FOUND"}, 404
    body = request.get_json(silent=True) or {}
    errs = account_delete_schema.validate(body)
    if errs:
        return {"status": "error", "code": "VALIDATION_ERROR", "errors": errs}, 400
    data = account_delete_schema.load(body)
    if not user.check_password(data["password"]):
        return (
            {
                "status": "error",
                "message": "Password is incorrect.",
                "code": "UNAUTHORIZED",
            },
            401,
        )
    purge_user_account(user)
    db.session.commit()
    return "", 204


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
