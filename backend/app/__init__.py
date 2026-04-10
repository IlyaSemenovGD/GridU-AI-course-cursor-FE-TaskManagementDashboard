"""Application factory and extensions wiring."""

import os

from flasgger import Swagger
from flask import Flask
from flask_cors import CORS

from app.api.routes import register_blueprints
from app.config import config_by_name
from app.celery_app import init_celery
from app.extensions import cache, db, jwt, limiter, ma, socketio
from app import models  # noqa: F401  # register models with SQLAlchemy metadata
from app.socketio_events import register_socketio_handlers
from app.utils.errors import register_error_handlers
from app.db_sqlite_upgrade import apply_sqlite_migrations


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)

    cfg = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_by_name[cfg])

    db.init_app(app)
    ma.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)
    init_celery(app)
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["CORS_ORIGINS"],
        async_mode="threading",
        logger=False,
        engineio_logger=False,
    )
    register_socketio_handlers(socketio)
    register_error_handlers(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    )

    Swagger(
        app,
        template={
            "swagger": "2.0",
            "info": {
                "title": "Task & Support API",
                "description": (
                    "JWT auth (24h access tokens), task management, customer support "
                    "tickets, projects, notifications, and WebSocket events "
                    "(namespace default, connect with `auth: { token }` or `?token=`)."
                ),
                "version": "2.0.0",
            },
            "securityDefinitions": {
                "Bearer": {
                    "type": "apiKey",
                    "name": "Authorization",
                    "in": "header",
                    "description": "JWT: `Authorization: Bearer <access_token>`",
                }
            },
        },
    )

    register_blueprints(app)

    with app.app_context():
        db.create_all()
        apply_sqlite_migrations()

    @app.cli.command("init-db")
    def init_db() -> None:
        """Create database tables."""
        db.create_all()
        apply_sqlite_migrations()

    @app.cli.command("create-admin")
    def create_admin() -> None:
        """Create an admin user (interactive env vars or CLI args via flask shell)."""
        import click
        from sqlalchemy import func

        from app.models.user import User, UserRole
        from app.utils.usernames import allocate_username_from_email

        email = click.prompt("Email")
        password = click.prompt("Password", hide_input=True)
        name = click.prompt("Full name", default="Administrator")

        email_norm = email.strip().lower()
        if User.query.filter(func.lower(User.email) == email_norm).first():
            click.echo("User already exists.")
            return
        u = User(
            username=allocate_username_from_email(email_norm),
            email=email_norm,
            full_name=name.strip(),
            role=UserRole.ADMIN.value,
        )
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        click.echo(f"Admin created id={u.id}")

    return app
