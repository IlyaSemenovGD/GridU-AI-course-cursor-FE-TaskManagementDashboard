"""WSGI entry for production / Docker (gunicorn).

Flask-SocketIO expects the SocketIO instance as the WSGI callable when using
a standard WSGI server (HTTP routes still go through Flask).
"""

import os

from app import create_app
from app.extensions import socketio

create_app(os.getenv("FLASK_ENV", "production"))
app = socketio
