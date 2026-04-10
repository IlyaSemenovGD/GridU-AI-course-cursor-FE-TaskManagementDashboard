"""Application configuration."""

import os
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
    JWT_ACCESS_TOKEN_EXPIRES = False  # set timedelta in production
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", _default_cors).split(",")
        if o.strip()
    ]


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    # Single shared in-memory DB across connections (test client + app context).
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
