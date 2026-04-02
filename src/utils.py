"""Shared utility functions."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import List


def sha256_file(path: Path) -> str:
    """Compute SHA256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def slugify(text: str) -> str:
    """Convert text to a URL/filename-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def extract_wikilinks(text: str) -> List[str]:
    """Extract all [[wikilink]] targets from markdown text."""
    return re.findall(r"\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]", text)


def read_markdown(path: Path) -> str:
    """Read a markdown file, returning empty string if it doesn't exist."""
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def ensure_dir(path: Path) -> Path:
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def word_count(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def strip_frontmatter(text: str) -> str:
    """Remove YAML front matter from markdown text."""
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            return text[end + 3:].strip()
    return text
