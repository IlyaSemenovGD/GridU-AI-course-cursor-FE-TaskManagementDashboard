"""PRD subject charset and RFC 5322-style email validation."""

import pytest
from marshmallow import ValidationError

from app.utils.support_validation import normalize_email_rfc5322, validate_subject_prd


def test_subject_allows_prd_punctuation() -> None:
    validate_subject_prd("Login issue (billing) - ticket #42 & more!")


def test_subject_rejects_non_ascii_letters() -> None:
    with pytest.raises(ValidationError):
        validate_subject_prd("café broken")


def test_subject_rejects_emoji() -> None:
    with pytest.raises(ValidationError):
        validate_subject_prd("Hello 😀 support")


def test_email_normalizes_and_validates() -> None:
    out = normalize_email_rfc5322("User.Name+tag@Example.COM")
    assert out.endswith("@example.com")


def test_email_rejects_garbage() -> None:
    with pytest.raises(ValidationError):
        normalize_email_rfc5322("not-an-email")
