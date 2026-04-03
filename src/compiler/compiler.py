"""Main wiki compilation orchestrator."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable, Dict, Optional

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


def run_compile(
    config: Config,
    full: bool = False,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> Dict[str, int]:
    """Run the wiki compilation pipeline.

    Args:
        config: Project configuration.
        full: If True, force full recompilation.
        progress_callback: Optional callback for streaming progress updates.

    Returns:
        Dict with counts: summarized, concepts, topics.
    """
    def progress(msg: str):
        logger.info(msg)
        if progress_callback:
            progress_callback(msg)

    llm = LLM(config)
    manifest = Manifest(config.raw_path / "_manifest.yaml")
    state = _load_compilation_state(config)

    stats = {"summarized": 0, "concepts": 0, "topics": 0}

    # Step 1: Identify sources to process
    if full:
        entries = manifest.all_entries()
        progress(f"Full recompilation: {len(entries)} sources")
    else:
        entries = manifest.get_uncompiled() + manifest.get_modified()
        progress(f"Incremental compilation: {len(entries)} new/modified sources")

    if not entries and not full:
        progress("Nothing to compile. Regenerating indexes...")
        generate_indexes(config, llm)
        return stats

    # Step 2: Summarize sources
    progress("Step 1/6: Summarizing sources...")
    results = summarize_sources(config, llm, entries)
    stats["summarized"] = len(results)
    for entry, wiki_path in results:
        progress(f"  Summarized: {entry.title}")

    # Mark compiled in manifest
    for entry, wiki_path in results:
        source_path = config.raw_path / entry.path
        manifest.mark_compiled(entry.path, sha256_file(source_path))
    manifest.save()

    # Step 3: Extract concepts and categorize
    progress("Step 2/6: Extracting concepts...")
    categorization = extract_and_categorize(config, llm)
    topics = categorization.get("topics", {})
    stats["topics"] = len(topics)
    progress(f"  Found {len(topics)} topics")

    # Step 4: Generate concept articles
    progress("Step 3/6: Generating concept articles...")
    stats["concepts"] = generate_concept_articles(config, llm, categorization)
    progress(f"  Generated {stats['concepts']} concept articles")

    # Step 5: Build backlinks
    progress("Step 4/6: Building backlinks...")
    build_backlinks(config)

    # Step 6: Generate indexes and summary
    progress("Step 5/6: Generating indexes...")
    generate_indexes(config, llm, categorization)

    # Step 7: Save compilation state
    progress("Step 6/6: Saving compilation state...")
    _save_compilation_state(config, manifest)

    progress(f"Done! {llm.token_usage_summary()}")
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
