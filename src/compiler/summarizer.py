"""Summarize raw source documents into wiki articles."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import frontmatter

from ..config import Config
from ..llm import LLM
from ..utils import slugify, read_markdown, ensure_dir
from ..ingest.manifest import ManifestEntry

logger = logging.getLogger(__name__)


def summarize_sources(
    config: Config,
    llm: LLM,
    entries: List[ManifestEntry],
) -> List[Tuple[ManifestEntry, Path]]:
    """Summarize new/modified source documents.

    Returns list of (entry, wiki_path) tuples for successfully summarized sources.
    """
    sources_dir = ensure_dir(config.wiki_path / "sources")
    results = []

    for entry in entries:
        source_path = config.raw_path / entry.path
        if not source_path.exists():
            logger.warning("Source file not found: %s", entry.path)
            continue

        content = read_markdown(source_path)
        if not content.strip():
            logger.warning("Empty source file: %s", entry.path)
            continue

        # Strip front matter from content before sending to LLM
        try:
            post = frontmatter.loads(content)
            raw_content = post.content
        except Exception:
            raw_content = content

        logger.info("Summarizing: %s", entry.title)

        summary_md = llm.call(
            prompt="",
            template="summarize_source.md",
            template_vars={
                "title": entry.title,
                "source_url": entry.source_url,
                "content": raw_content,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "concepts_placeholder": "  # will be filled by LLM",
            },
        )

        # Save the summary
        slug = slugify(entry.title)
        wiki_path = sources_dir / f"{slug}.md"
        wiki_path.write_text(summary_md, encoding="utf-8")

        results.append((entry, wiki_path))
        logger.info("Saved summary: %s", wiki_path.name)

    return results
