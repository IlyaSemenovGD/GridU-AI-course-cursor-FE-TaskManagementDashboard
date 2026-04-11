"""Magic-byte checks for ticket attachments."""

import io
import zipfile

import pytest

from app.utils.file_signatures import content_matches_extension


def test_pdf_signature() -> None:
    assert content_matches_extension(b"%PDF-1.4\n%EOF", ".pdf")
    assert not content_matches_extension(b"hello", ".pdf")


def test_jpeg_signature() -> None:
    assert content_matches_extension(b"\xff\xd8\xff\xe0\x00\x10", ".jpg")
    assert not content_matches_extension(b"%PDF-1.4", ".jpg")


def test_png_signature() -> None:
    data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert content_matches_extension(data, ".png")


def test_wrong_ext_for_pdf_bytes() -> None:
    assert not content_matches_extension(b"%PDF-1.4", ".png")


def test_docx_zip_contains_word_document() -> None:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<w:document/>")
    data = buf.getvalue()
    assert content_matches_extension(data, ".docx")
    assert not content_matches_extension(data, ".pdf")


def test_doc_ole_header() -> None:
    ole = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 32
    assert content_matches_extension(ole, ".doc")
