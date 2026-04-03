"""Shared utility functions."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Union


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


def parse_llm_json(response: str) -> Union[Dict, List]:
    """Extract JSON from an LLM response, handling code blocks and extra text."""
    # Try direct parse
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # Try ```json blocks
    if "```json" in response:
        try:
            json_str = response.split("```json")[1].split("```")[0]
            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError):
            pass

    # Try ``` blocks
    if "```" in response:
        try:
            json_str = response.split("```")[1].split("```")[0]
            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError):
            pass

    # Find first JSON object or array in response
    for i, ch in enumerate(response):
        if ch in ("{", "["):
            close = "}" if ch == "{" else "]"
            depth = 0
            for j in range(i, len(response)):
                if response[j] == ch:
                    depth += 1
                elif response[j] == close:
                    depth -= 1
                if depth == 0:
                    try:
                        return json.loads(response[i:j + 1])
                    except json.JSONDecodeError:
                        break
            break

    raise ValueError(f"Could not parse JSON from LLM response: {response[:200]}...")
