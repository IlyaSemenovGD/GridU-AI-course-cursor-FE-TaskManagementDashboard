"""Persist notifications and push to WebSocket subscribers."""

from app.extensions import db
from app.models.notification import Notification
from app.schemas.notification_schema import notification_schema


def create_and_emit(
    user_ids: list[int],
    *,
    event_type: str,
    title: str,
    body: str = "",
    entity_type: str | None = None,
    entity_id: str | None = None,
    exclude_user_id: int | None = None,
) -> list[Notification]:
    from app.extensions import socketio

    created: list[Notification] = []
    for uid in user_ids:
        if exclude_user_id is not None and uid == exclude_user_id:
            continue
        n = Notification(
            user_id=uid,
            type=event_type,
            title=title,
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.session.add(n)
        created.append(n)
    db.session.commit()

    for n in created:
        payload = notification_schema.dump(n)
        try:
            socketio.emit("notification", payload, room=f"user_{n.user_id}")
        except RuntimeError:
            pass
    return created


def notify_project_except(
    project_id: int,
    *,
    event_type: str,
    title: str,
    body: str = "",
    entity_type: str | None = None,
    entity_id: str | None = None,
    actor_user_id: int | None = None,
) -> None:
    from app.models.project import ProjectMember

    rows = (
        ProjectMember.query.filter_by(project_id=project_id)
        .with_entities(ProjectMember.user_id)
        .all()
    )
    ids = [r[0] for r in rows]
    if not ids:
        return
    create_and_emit(
        ids,
        event_type=event_type,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
        exclude_user_id=actor_user_id,
    )
