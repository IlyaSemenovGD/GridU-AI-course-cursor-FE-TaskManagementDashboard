"""Application configuration."""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.pool import StaticPool

load_dotenv()

_base_dir = Path(__file__).resolve().parent.parent
_instance = _base_dir / "instance"
_instance.mkdir(exist_ok=True)
_default_sqlite = f"sqlite:///{_instance / 'app.db'}"


_default_cors = (
    "http://127.0.0.1:5173,http://localhost:5173,"
    "http://127.0.0.1:5174,http://localhost:5174"
)


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", _default_sqlite)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-in-production")
    # PRD NFR-006: JWT expires after 24 hours (testing overrides to False for convenience).
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    RATELIMIT_ENABLED = True
    # Explicit storage avoids Flask-Limiter’s “in-memory not recommended” UserWarning
    # when no URI is set. Override with redis://… in production if needed.
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    # Cache: use Redis when REDIS_URL is set, else in-process SimpleCache
    CACHE_TYPE = os.getenv("CACHE_TYPE") or (
        "RedisCache" if os.getenv("REDIS_URL") else "SimpleCache"
    )
    CACHE_REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", "120"))
    # Celery (async notifications, etc.)
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/1")
    CELERY_RESULT_BACKEND = os.getenv(
        "CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/2"
    )
    CELERY_TASK_ALWAYS_EAGER = False
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", _default_cors).split(",")
        if o.strip()
    ]


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    # No Redis required for local dev / Playwright E2E (tasks run in-process).
    # For real async workers + Redis, set FLASK_ENV=production and run Celery worker.
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_BROKER_URL = "memory://"
    CELERY_RESULT_BACKEND = "cache+memory://"


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    JWT_ACCESS_TOKEN_EXPIRES = False
    RATELIMIT_ENABLED = False
    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = 60
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_BROKER_URL = "memory://"
    CELERY_RESULT_BACKEND = "cache+memory://"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    # Single shared in-memory DB across connections (test client + app context).
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }


class TestingRateLimitConfig(TestingConfig):
    """Like testing, but Flask-Limiter is enabled (for rate-limit integration tests)."""

    RATELIMIT_ENABLED = True


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "testing_ratelimit": TestingRateLimitConfig,
}
