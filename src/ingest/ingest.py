"""Ingest pipeline — scan raw/ for new and modified files."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Optional

import frontmatter

from ..config import Config
from ..utils import sha256_file
from .manifest import Manifest
from .images import download_images

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf"}


def run_ingest(config: Config, file_path: Optional[str] = None) -> Dict[str, int]:
    """Run the ingest pipeline.

    Scans raw/ for new/modified files, downloads remote images,
    and updates the manifest.

    Returns:
        Dict with counts: new, modified, unchanged
    """
    manifest = Manifest(config.raw_path / "_manifest.yaml")
    stats = {"new": 0, "modified": 0, "unchanged": 0}

    if file_path:
        files = [Path(file_path)]
        if not files[0].is_absolute():
            files = [config.raw_path / file_path]
    else:
        files = _scan_raw_dir(config.raw_path)

    for fpath in files:
        rel_path = str(fpath.relative_to(config.raw_path))
        file_hash = sha256_file(fpath)
        existing = manifest.get_entry(rel_path)

        if existing and existing.sha256 == file_hash:
            stats["unchanged"] += 1
            continue

        # Process the file
        title = _extract_title(fpath)

        if fpath.suffix == ".md":
            # Download remote images to local
            updated_content = download_images(fpath, config.raw_path / "images")
            if updated_content != fpath.read_text(encoding="utf-8"):
                fpath.write_text(updated_content, encoding="utf-8")
                file_hash = sha256_file(fpath)  # Recompute after image rewriting

        source_url = _extract_source_url(fpath)

        if existing:
            existing.sha256 = file_hash
            existing.compiled = False  # Mark for recompilation
            stats["modified"] += 1
            logger.info("Modified: %s", rel_path)
        else:
            manifest.add_entry(
                path=rel_path,
                sha256=file_hash,
                title=title,
                source_url=source_url,
            )
            stats["new"] += 1
            logger.info("New: %s", rel_path)

    manifest.save()
    return stats


def _scan_raw_dir(raw_path: Path) -> list:
    """Find all supported files in raw/, excluding manifest and images dir."""
    files = []
    for ext in SUPPORTED_EXTENSIONS:
        for f in raw_path.rglob(f"*{ext}"):
            if f.name.startswith("_"):
                continue
            if "images" in f.parts:
                continue
            files.append(f)
    return sorted(files)


def _extract_title(fpath: Path) -> str:
    """Extract title from a file — front matter, first heading, or filename."""
    if fpath.suffix == ".md":
        try:
            post = frontmatter.load(str(fpath))
            if "title" in post.metadata:
                return post.metadata["title"]
        except Exception:
            pass

        # Try first heading
        for line in fpath.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("# "):
                return line[2:].strip()

    return fpath.stem.replace("-", " ").replace("_", " ").title()


def _extract_source_url(fpath: Path) -> str:
    """Extract source URL from front matter if present."""
    if fpath.suffix == ".md":
        try:
            post = frontmatter.load(str(fpath))
            return post.metadata.get("url", post.metadata.get("source", ""))
        except Exception:
            pass
    return ""
