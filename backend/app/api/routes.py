"""Register API blueprints."""

from flask import Flask

from app.api import (
    auth,
    health,
    notifications,
    projects,
    support_admin,
    support_agents,
    support_tickets,
    tasks,
    users,
)


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(users.bp, url_prefix="/api/users")
    app.register_blueprint(tasks.bp, url_prefix="/api")
    app.register_blueprint(projects.bp, url_prefix="/api")
    app.register_blueprint(notifications.bp, url_prefix="/api")
    app.register_blueprint(support_tickets.bp, url_prefix="/api")
    app.register_blueprint(support_agents.bp, url_prefix="/api")
    app.register_blueprint(support_admin.bp, url_prefix="/api")
