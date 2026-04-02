"""Main wiki compilation orchestrator."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict

import yaml

from ..config import Config
from ..llm import LLM
from ..utils import sha256_file
from ..ingest.manifest import Manifest
from .summarizer import summarize_sources
from .categorizer import extract_and_categorize, generate_concept_articles
from .linker import build_backlinks
from .indexer import generate_indexes

logger = logging.getLogger(__name__)


def run_compile(config: Config, full: bool = False) -> Dict[str, int]:
    """Run the wiki compilation pipeline.

    Args:
        config: Project configuration.
        full: If True, force full recompilation.

    Returns:
        Dict with counts: summarized, concepts, topics.
    """
    llm = LLM(config)
    manifest = Manifest(config.raw_path / "_manifest.yaml")
    state = _load_compilation_state(config)

    stats = {"summarized": 0, "concepts": 0, "topics": 0}

    # Step 1: Identify sources to process
    if full:
        entries = manifest.all_entries()
        logger.info("Full recompilation: %d sources", len(entries))
    else:
        entries = manifest.get_uncompiled() + manifest.get_modified()
        logger.info("Incremental compilation: %d new/modified sources", len(entries))

    if not entries and not full:
        logger.info("Nothing to compile.")
        # Still regenerate indexes in case files were manually changed
        generate_indexes(config, llm)
        return stats

    # Step 2: Summarize sources
    results = summarize_sources(config, llm, entries)
    stats["summarized"] = len(results)

    # Mark compiled in manifest
    for entry, wiki_path in results:
        source_path = config.raw_path / entry.path
        manifest.mark_compiled(entry.path, sha256_file(source_path))
    manifest.save()

    # Step 3: Extract concepts and categorize
    categorization = extract_and_categorize(config, llm)
    topics = categorization.get("topics", {})
    stats["topics"] = len(topics)

    # Step 4: Generate concept articles
    stats["concepts"] = generate_concept_articles(config, llm, categorization)

    # Step 5: Build backlinks
    build_backlinks(config)

    # Step 6: Generate indexes and summary
    generate_indexes(config, llm, categorization)

    # Step 7: Save compilation state
    _save_compilation_state(config, manifest)

    logger.info("Compilation complete. %s", llm.token_usage_summary())
    return stats


def _load_compilation_state(config: Config) -> dict:
    state_path = config.wiki_path / "_compilation_state.yaml"
    if state_path.exists():
        return yaml.safe_load(state_path.read_text(encoding="utf-8")) or {}
    return {}


def _save_compilation_state(config: Config, manifest: Manifest):
    state = {
        "sources": {},
    }
    for entry in manifest.all_entries():
        state["sources"][entry.path] = {
            "compiled_hash": entry.compiled_hash,
            "compiled": entry.compiled,
        }
    state_path = config.wiki_path / "_compilation_state.yaml"
    state_path.write_text(
        yaml.dump(state, default_flow_style=False, sort_keys=False),
        encoding="utf-8",
    )
