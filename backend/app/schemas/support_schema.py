"""Marshmallow schemas for support tickets."""

from marshmallow import Schema, fields, validates
from marshmallow.validate import Length, OneOf, Range

from app.models.support import TicketCategory, TicketPriority, TicketStatus
from app.utils.support_validation import (
    normalize_email_rfc5322,
    validate_subject_prd,
)


def _no_control_chars(value: str) -> None:
    if any(ord(c) < 32 for c in value):
        raise fields.ValidationError("Contains invalid control characters.")


class RFC5322Email(fields.String):
    """PRD NFR-015: validate/normalize email (email-validator, no DNS probe)."""

    def _deserialize(self, value, attr, data, **kwargs):
        if value is None or (isinstance(value, str) and not value.strip()):
            raise fields.ValidationError("Not a valid email address.")
        return normalize_email_rfc5322(str(value))


class TicketCreateSchema(Schema):
    subject = fields.String(required=True, validate=Length(min=5, max=200))
    description = fields.String(required=True, validate=Length(min=20, max=5000))
    priority = fields.String(
        required=True, validate=OneOf([p.value for p in TicketPriority])
    )
    category = fields.String(
        required=True, validate=OneOf([c.value for c in TicketCategory])
    )
    customer_email = RFC5322Email(required=True)
    auto_assign = fields.Boolean(load_default=True)

    @validates("subject")
    def validate_subject_chars(self, value: str, **_kwargs) -> None:
        _no_control_chars(value)
        validate_subject_prd(value)


class TicketUpdateSchema(Schema):
    subject = fields.String(validate=Length(min=5, max=200))
    description = fields.String(validate=Length(min=20, max=5000))

    @validates("subject")
    def validate_subject_chars(self, value: str | None, **_kwargs) -> None:
        if value is None:
            return
        _no_control_chars(value)
        validate_subject_prd(value)


class TicketStatusSchema(Schema):
    status = fields.String(
        required=True, validate=OneOf([s.value for s in TicketStatus])
    )
    note = fields.String(load_default=None, validate=Length(max=2000))


class TicketPrioritySchema(Schema):
    priority = fields.String(
        required=True, validate=OneOf([p.value for p in TicketPriority])
    )
    reason = fields.String(required=True, validate=Length(min=5, max=2000))


class TicketAssignSchema(Schema):
    agent_id = fields.Integer(required=True, validate=Range(min=1))


class CommentCreateSchema(Schema):
    content = fields.String(required=True, validate=Length(min=1, max=10000))
    is_internal = fields.Boolean(load_default=False)
    mention_user_ids = fields.List(fields.Integer(), load_default=list)


ALLOWED_ATTACHMENT_EXT = frozenset({".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"})
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
MAX_ATTACHMENTS_PER_TICKET = 3

class SupportTicketDumpSchema(Schema):
    id = fields.Integer()
    ticket_number = fields.String()
    subject = fields.String()
    description = fields.String()
    status = fields.String()
    priority = fields.String()
    category = fields.String()
    customer_email = fields.String()
    customer_user_id = fields.Integer(allow_none=True)
    created_by_id = fields.Integer()
    assigned_to_id = fields.Integer(allow_none=True)
    first_response_at = fields.DateTime(allow_none=True)
    first_response_due_at = fields.DateTime(allow_none=True)
    resolution_due_at = fields.DateTime(allow_none=True)
    sla_response_breached = fields.Boolean()
    sla_resolution_breached = fields.Boolean()
    resolved_at = fields.DateTime(allow_none=True)
    closed_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class CommentDumpSchema(Schema):
    id = fields.Integer()
    ticket_id = fields.Integer()
    user_id = fields.Integer()
    content = fields.String()
    is_internal = fields.Boolean()
    created_at = fields.DateTime()


ticket_create_schema = TicketCreateSchema()
ticket_update_schema = TicketUpdateSchema()
ticket_status_schema = TicketStatusSchema()
ticket_priority_schema = TicketPrioritySchema()
ticket_assign_schema = TicketAssignSchema()
comment_create_schema = CommentCreateSchema()
ticket_dump_schema = SupportTicketDumpSchema()
comment_dump_schema = CommentDumpSchema()
