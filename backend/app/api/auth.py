"""JWT authentication routes (register / login)."""

from flasgger import swag_from
from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from sqlalchemy import func

from app.extensions import db
from app.models.user import User
from app.schemas.user_schema import user_register_schema, user_schema
from app.utils.usernames import allocate_username_from_email

bp = Blueprint("auth", __name__)


@bp.post("/register")
@swag_from(
    {
        "tags": ["Auth"],
        "summary": "Register a user",
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "required": ["name", "email", "password"],
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                        "password": {"type": "string"},
                    },
                },
            }
        ],
        "responses": {
            201: {"description": "User created"},
            400: {"description": "Validation error"},
            409: {"description": "Email already exists"},
        },
    }
)
def register():
    data = request.get_json(silent=True) or {}
    errors = user_register_schema.validate(data)
    if errors:
        return {"errors": errors}, 400

    validated = user_register_schema.load(data)
    email = validated["email"].strip().lower()
    if User.query.filter(func.lower(User.email) == email).first():
        return {"message": "An account with this email already exists."}, 409

    username = allocate_username_from_email(email)
    user = User(
        username=username,
        email=email,
        full_name=validated["name"].strip(),
    )
    user.set_password(validated["password"])
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    payload = user_schema.dump(user)
    payload["access_token"] = token
    return payload, 201


@bp.post("/login")
@swag_from(
    {
        "tags": ["Auth"],
        "summary": "Obtain JWT access token",
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "required": ["password"],
                    "properties": {
                        "email": {"type": "string"},
                        "username": {"type": "string"},
                        "password": {"type": "string"},
                    },
                },
            }
        ],
        "responses": {
            200: {"description": "Token issued"},
            401: {"description": "Invalid credentials"},
        },
    }
)
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or data.get("username") or "").strip()
    password = data.get("password")
    if not identifier or not password:
        return {"message": "Email and password are required."}, 400

    if "@" in identifier:
        user = User.query.filter(
            func.lower(User.email) == identifier.lower()
        ).first()
        if user is None:
            return {"message": "No account found for this email."}, 401
    else:
        user = User.query.filter_by(username=identifier).first()
        if user is None:
            return {"message": "No account found."}, 401

    if not user.check_password(password):
        return {"message": "Incorrect password."}, 401

    token = create_access_token(identity=str(user.id))
    return {"access_token": token}, 200
