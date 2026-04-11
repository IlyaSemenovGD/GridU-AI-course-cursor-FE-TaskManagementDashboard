"""Verify uploaded file bytes match allowed extensions (PRD NFR-011)."""

from __future__ import annotations

import io
import zipfile

def content_matches_extension(data: bytes, ext: str) -> bool:
    """
    Check magic bytes / structure for .pdf, .jpg/.jpeg, .png, .doc, .docx.
    `ext` must include leading dot, lowercased by caller.
    """
    if ext == ".jpeg":
        ext = ".jpg"
    if len(data) < 3:
        return False
    if ext == ".pdf":
        return data.startswith(b"%PDF")
    if ext == ".jpg":
        return len(data) >= 3 and data[:3] == b"\xff\xd8\xff"
    if ext == ".png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == ".doc":
        return data[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
    if ext == ".docx":
        if not data.startswith(b"PK\x03\x04"):
            return False
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                return "word/document.xml" in zf.namelist()
        except zipfile.BadZipFile:
            return False
    return False
