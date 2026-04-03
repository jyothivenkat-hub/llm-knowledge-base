"""Main wiki compilation orchestrator — knowledge graph pipeline."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable, Dict, Optional

import yaml

from ..config import Config
from ..llm import LLM
from ..utils import sha256_file, read_markdown, ensure_dir
from ..ingest.manifest import Manifest
from .graph_builder import build_graph
from .linker import build_backlinks
from .indexer import generate_indexes

logger = logging.getLogger(__name__)


def run_compile(
    config: Config,
    full: bool = False,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> Dict[str, int]:
    """Run the knowledge graph compilation pipeline.

    Pipeline:
    1. Extract text from raw sources (PDF/md)
    2. Chunk into atomic claims → wiki/claims/*.md
    3. Connect claims across papers
    4. Cluster into themes
    5. Enrich with insights
    6. Build indexes for search

    Returns dict with stats.
    """
    def progress(msg: str):
        logger.info(msg)
        if progress_callback:
            progress_callback(msg)

    llm = LLM(config)
    manifest = Manifest(config.raw_path / "_manifest.yaml")

    stats = {"sources": 0, "claims": 0, "edges": 0, "clusters": 0, "ideas": 0}

    # Step 1: Identify sources
    if full:
        entries = manifest.all_entries()
        progress(f"Full compilation: {len(entries)} sources")
    else:
        entries = manifest.get_uncompiled() + manifest.get_modified()
        progress(f"Incremental: {len(entries)} new/modified sources")

    if not entries and not full:
        progress("Nothing to compile.")
        return stats

    stats["sources"] = len(entries)

    # Step 2: Extract text from all raw sources
    progress("Step 1/2: Extracting text from sources...")
    source_texts = _extract_all_sources(config, entries, progress)
    progress(f"  Extracted text from {len(source_texts)} sources")

    # Mark compiled
    for entry in entries:
        source_path = config.raw_path / entry.path
        if source_path.exists():
            manifest.mark_compiled(entry.path, sha256_file(source_path))
    manifest.save()

    # Step 3: Build knowledge graph (chunk → connect → cluster → enrich → save)
    # This reads the extracted texts, chunks them, saves wiki/claims/*.md,
    # finds connections, clusters, enriches, and saves graph.json
    progress("Step 2/2: Building knowledge graph...")
    graph_stats = build_graph(config, llm, source_texts, progress_callback=progress_callback)
    stats["claims"] = graph_stats.get("claims", 0)
    stats["edges"] = graph_stats.get("edges", 0)
    stats["clusters"] = graph_stats.get("clusters", 0)
    stats["ideas"] = graph_stats.get("ideas", 0)

    # Build legacy indexes + backlinks
    progress("Building indexes...")
    build_backlinks(config)
    generate_indexes(config, llm)

    # Save state
    _save_compilation_state(config, manifest)

    progress(f"Done! {llm.token_usage_summary()}")
    return stats


def _extract_all_sources(
    config: Config,
    entries,
    progress: Callable,
) -> Dict[str, Dict]:
    """Extract text from all raw sources. Returns {entry_path: {title, text, source_url}}."""
    source_texts = {}

    for entry in entries:
        source_path = config.raw_path / entry.path

        if not source_path.exists():
            logger.warning("Source not found: %s", entry.path)
            continue

        text = ""
        if source_path.suffix.lower() == ".pdf":
            try:
                import pymupdf
                doc = pymupdf.open(str(source_path))
                text = "\n".join(page.get_text() for page in doc)
                doc.close()
                progress(f"  Extracted PDF: {entry.title}")
            except Exception as e:
                logger.warning("Failed to read PDF %s: %s", entry.path, e)
                continue
        else:
            text = read_markdown(source_path)
            # Strip front matter
            if text.startswith("---"):
                end = text.find("---", 3)
                if end != -1:
                    text = text[end + 3:].strip()
            progress(f"  Read: {entry.title}")

        if text.strip():
            source_texts[entry.path] = {
                "title": entry.title,
                "text": text,
                "source_url": entry.source_url,
            }

    return source_texts


def _save_compilation_state(config: Config, manifest: Manifest):
    state = {"sources": {}}
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
