"""Image downloader for markdown files — downloads remote images to local."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests

from ..utils import slugify

logger = logging.getLogger(__name__)


def download_images(md_path: Path, images_dir: Path) -> str:
    """Download remote images referenced in a markdown file to local.

    Returns the updated markdown content with local image paths.
    """
    content = md_path.read_text(encoding="utf-8")
    images_dir.mkdir(parents=True, exist_ok=True)

    # Match both ![alt](url) and <img src="url"> patterns
    img_pattern = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
    replacements = []

    for match in img_pattern.finditer(content):
        alt_text = match.group(1)
        url = match.group(2)

        if _is_remote_url(url):
            local_path = _download_image(url, images_dir)
            if local_path:
                replacements.append((match.group(0), f"![{alt_text}]({local_path})"))

    for old, new in replacements:
        content = content.replace(old, new)

    if replacements:
        logger.info("Downloaded %d images for %s", len(replacements), md_path.name)

    return content


def _is_remote_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https")


def _download_image(url: str, images_dir: Path) -> Optional[str]:
    """Download an image and return the relative path from raw/."""
    try:
        resp = requests.get(url, timeout=30, stream=True)
        resp.raise_for_status()

        # Determine filename from URL
        parsed = urlparse(url)
        filename = Path(parsed.path).name
        if not filename or "." not in filename:
            content_type = resp.headers.get("content-type", "")
            ext = ".png" if "png" in content_type else ".jpg"
            filename = slugify(parsed.path[-30:]) + ext

        dest = images_dir / filename
        # Avoid overwriting
        if dest.exists():
            return str(Path("images") / filename)

        with open(dest, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)

        logger.debug("Downloaded: %s -> %s", url, dest)
        return str(Path("images") / filename)

    except Exception as e:
        logger.warning("Failed to download %s: %s", url, e)
        return None
