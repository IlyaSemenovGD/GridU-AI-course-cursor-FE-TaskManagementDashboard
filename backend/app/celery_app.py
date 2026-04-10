"""Celery application. Worker: `celery -A app.celery_app.celery worker --loglevel=info`."""

from __future__ import annotations

import os

from celery import Celery

celery = Celery(__name__, include=["app.tasks.background"])

_flask_app = None


def get_flask_app():
    """Lazy Flask app for worker processes and task context."""
    global _flask_app
    if _flask_app is None:
        from app import create_app

        _flask_app = create_app(os.getenv("FLASK_ENV", "development"))
    return _flask_app


class ContextTask(celery.Task):
    abstract = True

    def __call__(self, *args, **kwargs):
        with get_flask_app().app_context():
            return self.run(*args, **kwargs)


celery.Task = ContextTask


def init_celery(app) -> Celery:
    """Called from Flask factory so web and tasks share one app instance."""
    global _flask_app
    _flask_app = app
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        task_always_eager=app.config.get("CELERY_TASK_ALWAYS_EAGER", False),
        task_eager_propagates=True,
        broker_connection_retry_on_startup=True,
    )
    return celery
