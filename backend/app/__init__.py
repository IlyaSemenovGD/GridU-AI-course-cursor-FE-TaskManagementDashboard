"""Application factory and extensions wiring."""

import os

from flasgger import Swagger
from flask import Flask
from flask_cors import CORS

from app.api.routes import register_blueprints
from app.config import config_by_name
from app.extensions import db, jwt, ma, socketio
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
                "title": "Task Management API",
                "description": (
                    "JWT auth, tasks, projects, team members, notifications, "
                    "and WebSocket real-time events (namespace default, connect with "
                    "`auth: { token }` or `?token=`)."
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

    return app
