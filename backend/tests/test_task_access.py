"""Unit tests for app.services.task_access."""

from app.extensions import db
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.models.user import User
from app.services import task_access


def _user(app, email="ta@example.com"):
    with app.app_context():
        u = User(
            username="ta_user",
            email=email,
            full_name="TA",
            password_hash="x",
        )
        u.set_password("password12")
        db.session.add(u)
        db.session.commit()
        return u.id


def test_project_ids_for_user_empty(app):
    uid = _user(app, email="empty@example.com")
    with app.app_context():
        assert task_access.project_ids_for_user(uid) == []


def test_is_project_owner_and_can_access_project_task(app):
    with app.app_context():
        o = User(
            username="owner_ta",
            email="owner_ta@example.com",
            full_name="O",
            password_hash="x",
        )
        o.set_password("p")
        m = User(
            username="mem_ta",
            email="mem_ta@example.com",
            full_name="M",
            password_hash="x",
        )
        m.set_password("p")
        db.session.add_all([o, m])
        db.session.commit()
        p = Project(name="P", description="", owner_id=o.id)
        db.session.add(p)
        db.session.flush()
        db.session.add(
            ProjectMember(project_id=p.id, user_id=o.id, role="owner")
        )
        db.session.add(
            ProjectMember(project_id=p.id, user_id=m.id, role="member")
        )
        t = Task(
            user_id=o.id,
            project_id=p.id,
            title="T",
            description="",
            due_date="2026-01-01",
            priority="low",
            status="todo",
            assignee="M",
        )
        db.session.add(t)
        db.session.commit()

        assert task_access.is_project_owner(p.id, o.id) is True
        assert task_access.is_project_owner(p.id, m.id) is False
        assert task_access.is_project_owner(99999, o.id) is False

        assert task_access.can_access_task(m.id, t) is True
        assert task_access.can_access_task(o.id, t) is True

        outsider = User(
            username="out_ta",
            email="out_ta@example.com",
            full_name="X",
            password_hash="x",
        )
        outsider.set_password("p")
        db.session.add(outsider)
        db.session.commit()
        assert task_access.can_access_task(outsider.id, t) is False


def test_can_access_personal_task(app):
    with app.app_context():
        u = User(
            username="solo_ta",
            email="solo_ta@example.com",
            full_name="S",
            password_hash="x",
        )
        u.set_password("p")
        db.session.add(u)
        db.session.commit()
        t = Task(
            user_id=u.id,
            project_id=None,
            title="Solo",
            description="",
            due_date="2026-01-01",
            priority="low",
            status="todo",
            assignee="S",
        )
        db.session.add(t)
        db.session.commit()
        assert task_access.can_access_task(u.id, t) is True
        assert task_access.can_access_task(999, t) is False
