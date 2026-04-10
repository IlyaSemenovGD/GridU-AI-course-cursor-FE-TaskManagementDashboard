"""WebSocket connection auth (JWT) and user rooms for real-time notifications."""

from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import join_room


def register_socketio_handlers(socketio) -> None:
    @socketio.on("connect")
    def on_connect(auth):  # noqa: ANN001
        token = None
        if isinstance(auth, dict):
            token = auth.get("token")
        if not token:
            token = request.args.get("token")
        if not token:
            return False
        try:
            decoded = decode_token(token)
            uid = int(decoded["sub"])
        except Exception:
            return False
        join_room(f"user_{uid}")
        return True
