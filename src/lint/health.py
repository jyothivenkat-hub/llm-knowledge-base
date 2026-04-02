"""LLM-powered health checks for the wiki."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..config import Config
from ..llm import LLM
from ..utils import read_markdown, extract_wikilinks, ensure_dir

logger = logging.getLogger(__name__)

CHECKS = ["orphans", "broken-links", "stale", "missing-concepts", "inconsistencies"]


def run_lint(config: Config, check_name: Optional[str] = None) -> str:
    """Run health checks on the wiki.

    Returns a markdown report.
    """
    checks_to_run = [check_name] if check_name else CHECKS
    report_parts = [f"# Wiki Health Report\n\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"]

    for check in checks_to_run:
        if check == "orphans":
            report_parts.append(_check_orphans(config))
        elif check == "broken-links":
            report_parts.append(_check_broken_links(config))
        elif check == "stale":
            report_parts.append(_check_stale(config))
        elif check == "missing-concepts":
            report_parts.append(_check_missing_concepts(config))
        elif check == "inconsistencies":
            report_parts.append(_check_inconsistencies(config))
        else:
            report_parts.append(f"## Unknown check: {check}\n")

    report = "\n".join(report_parts)

    # Save report
    output_dir = ensure_dir(config.output_path)
    report_path = output_dir / f"health-report-{datetime.now().strftime('%Y%m%d')}.md"
    report_path.write_text(report, encoding="utf-8")
    logger.info("Health report saved to: %s", report_path)

    return report


def _check_orphans(config: Config) -> str:
    """Find wiki articles with zero incoming links."""
    wiki_path = config.wiki_path
    all_files = set()
    all_targets = set()

    for md_file in wiki_path.rglob("*.md"):
        if md_file.name.startswith("_"):
            continue
        rel = md_file.relative_to(wiki_path)
        all_files.add(md_file.stem)

        content = read_markdown(md_file)
        for link in extract_wikilinks(content):
            all_targets.add(link.lower())

    orphans = [f for f in all_files if f.lower() not in all_targets]

    lines = ["## Orphan Articles", f"Found {len(orphans)} articles with no incoming links:", ""]
    for o in sorted(orphans):
        lines.append(f"- {o}")
    lines.append("")
    return "\n".join(lines)


def _check_broken_links(config: Config) -> str:
    """Find [[wikilinks]] pointing to nonexistent files."""
    wiki_path = config.wiki_path
    existing_stems = set()

    for md_file in wiki_path.rglob("*.md"):
        existing_stems.add(md_file.stem.lower())

    broken = []
    for md_file in wiki_path.rglob("*.md"):
        content = read_markdown(md_file)
        links = extract_wikilinks(content)
        rel = str(md_file.relative_to(wiki_path))
        for link in links:
            # Handle path-style links like "sources/article-name"
            link_stem = link.split("/")[-1].lower() if "/" in link else link.lower()
            if link_stem not in existing_stems:
                broken.append(f"  - `[[{link}]]` in {rel}")

    lines = ["## Broken Links", f"Found {len(broken)} broken wikilinks:", ""]
    lines.extend(broken)
    lines.append("")
    return "\n".join(lines)


def _check_stale(config: Config) -> str:
    """Find source summaries whose raw source has been modified."""
    from ..ingest.manifest import Manifest
    from ..utils import sha256_file

    manifest = Manifest(config.raw_path / "_manifest.yaml")
    stale = []

    for entry in manifest.all_entries():
        if entry.compiled:
            source_path = config.raw_path / entry.path
            if source_path.exists():
                current_hash = sha256_file(source_path)
                if current_hash != entry.compiled_hash:
                    stale.append(entry.path)

    lines = ["## Stale Content", f"Found {len(stale)} sources modified since last compilation:", ""]
    for s in stale:
        lines.append(f"- {s}")
    lines.append("")
    return "\n".join(lines)


def _check_missing_concepts(config: Config) -> str:
    """Use LLM to suggest missing concepts."""
    llm = LLM(config)
    concepts_dir = config.wiki_path / "concepts"
    topics_dir = config.wiki_path / "topics"

    concepts = []
    if concepts_dir.exists():
        concepts = [f.stem for f in concepts_dir.glob("*.md") if not f.name.startswith("_")]

    topics = []
    if topics_dir.exists():
        topics = [d.name for d in topics_dir.iterdir() if d.is_dir()]

    if not concepts:
        return "## Missing Concepts\nNo concepts exist yet. Run `kb compile` first.\n"

    # Get wiki structure for context
    wiki_structure = read_markdown(config.wiki_path / "_index.md")

    response = llm.call(
        prompt="",
        template="lint_check.md",
        template_vars={
            "check_type": "missing_concepts",
            "wiki_structure": wiki_structure,
            "concepts_list": "\n".join(f"- {c}" for c in concepts),
            "topics_list": "\n".join(f"- {t}" for t in topics),
        },
    )

    return f"## Missing Concepts Analysis\n\n{response}\n"


def _check_inconsistencies(config: Config) -> str:
    """Use LLM to find inconsistencies between related articles."""
    llm = LLM(config)
    concepts_dir = config.wiki_path / "concepts"

    if not concepts_dir.exists():
        return "## Inconsistencies\nNo concept articles to check.\n"

    concept_files = [f for f in concepts_dir.glob("*.md") if not f.name.startswith("_")]
    if len(concept_files) < 2:
        return "## Inconsistencies\nNeed at least 2 concept articles to check.\n"

    # Check pairs of related concepts (limit to avoid excessive API calls)
    pairs = []
    for i, f1 in enumerate(concept_files[:5]):
        for f2 in concept_files[i + 1 : i + 3]:
            c1 = read_markdown(f1)
            c2 = read_markdown(f2)
            pairs.append({
                "title1": f1.stem,
                "content1": c1[:1500],
                "title2": f2.stem,
                "content2": c2[:1500],
            })

    if not pairs:
        return "## Inconsistencies\nNo pairs to check.\n"

    wiki_structure = read_markdown(config.wiki_path / "_index.md")

    response = llm.call(
        prompt="",
        template="lint_check.md",
        template_vars={
            "check_type": "inconsistencies",
            "wiki_structure": wiki_structure,
            "article_pairs": pairs,
        },
    )

    return f"## Inconsistency Analysis\n\n{response}\n"
