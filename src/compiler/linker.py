"""Build backlinks and cross-links between wiki articles."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List

import yaml

from ..config import Config
from ..utils import extract_wikilinks, read_markdown

logger = logging.getLogger(__name__)


def build_backlinks(config: Config) -> Dict[str, List[str]]:
    """Scan all wiki .md files and build a backlink graph.

    Returns dict mapping target -> list of files that link to it.
    Also saves to wiki/_backlinks.yaml.
    """
    wiki_path = config.wiki_path
    backlinks: Dict[str, List[str]] = {}

    # Scan all .md files
    for md_file in wiki_path.rglob("*.md"):
        if md_file.name == "_backlinks.yaml":
            continue

        rel_path = str(md_file.relative_to(wiki_path))
        content = read_markdown(md_file)
        links = extract_wikilinks(content)

        for link in links:
            target = link.lower().strip()
            if target not in backlinks:
                backlinks[target] = []
            if rel_path not in backlinks[target]:
                backlinks[target].append(rel_path)

    # Save backlinks
    backlinks_path = wiki_path / "_backlinks.yaml"
    backlinks_path.write_text(
        yaml.dump(backlinks, default_flow_style=False, sort_keys=True),
        encoding="utf-8",
    )

    logger.info("Built backlinks: %d targets, %d total links",
                len(backlinks), sum(len(v) for v in backlinks.values()))

    return backlinks
