"""
SQLite: db.create_all() does not add columns to existing tables.

Patch older DB files when models gain columns (e.g. tasks.project_id).
"""

from sqlalchemy import inspect, text

from app.extensions import db


def apply_sqlite_migrations() -> None:
    engine = db.engine
    if engine.dialect.name != "sqlite":
        return

    insp = inspect(engine)
    table_names = set(insp.get_table_names())

    with engine.begin() as conn:
        if "users" in table_names:
            cols = {c["name"] for c in insp.get_columns("users")}
            if "full_name" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN full_name VARCHAR(120) "
                        "NOT NULL DEFAULT ''"
                    )
                )

        if "tasks" in table_names:
            cols = {c["name"] for c in insp.get_columns("tasks")}
            if "project_id" not in cols:
                conn.execute(
                    text("ALTER TABLE tasks ADD COLUMN project_id INTEGER")
                )
