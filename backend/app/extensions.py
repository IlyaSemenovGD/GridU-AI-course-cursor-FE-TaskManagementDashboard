"""Shared extension instances (initialized in the app factory)."""

from flask_jwt_extended import JWTManager
from flask_marshmallow import Marshmallow
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()
socketio = SocketIO()
