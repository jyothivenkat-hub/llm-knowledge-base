"""Generate index files for the wiki."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Any, Optional

import frontmatter

from ..config import Config
from ..llm import LLM
from ..utils import read_markdown, ensure_dir

logger = logging.getLogger(__name__)


def generate_indexes(config: Config, llm: LLM, categorization: Optional[Dict[str, Any]] = None):
    """Generate _index.md files for all wiki sections and the master index."""
    wiki_path = config.wiki_path

    # Generate sources index
    _generate_section_index(
        wiki_path / "sources",
        "Sources",
        "Summaries of all ingested source documents.",
    )

    # Generate concepts index
    _generate_section_index(
        wiki_path / "concepts",
        "Concepts",
        "Cross-source concept articles synthesized from multiple sources.",
    )

    # Generate topic indexes (already partially done by categorizer)
    topics_dir = wiki_path / "topics"
    if topics_dir.exists():
        for topic_dir in sorted(topics_dir.iterdir()):
            if topic_dir.is_dir():
                topic_name = topic_dir.name.replace("-", " ").title()
                _generate_section_index(topic_dir, topic_name, "")

        # Topics overview index
        _generate_section_index(topics_dir, "Topics", "Knowledge organized by topic area.")

    # Generate master index
    _generate_master_index(config)

    # Generate wiki summary
    _generate_wiki_summary(config, llm, categorization)


def _generate_section_index(section_dir: Path, title: str, description: str):
    """Generate an _index.md for a wiki section directory."""
    if not section_dir.exists():
        return

    articles = []
    for md_file in sorted(section_dir.glob("*.md")):
        if md_file.name.startswith("_"):
            continue
        # Extract brief from the file
        content = read_markdown(md_file)
        brief = _extract_brief(content, md_file.stem)
        articles.append({
            "name": md_file.stem,
            "title": _extract_title_from_content(content, md_file.stem),
            "brief": brief,
        })

    # Also list subdirectories
    subdirs = []
    for d in sorted(section_dir.iterdir()):
        if d.is_dir() and not d.name.startswith("."):
            subdirs.append(d.name)

    lines = [f"# {title}", ""]
    if description:
        lines.extend([description, ""])

    if articles:
        lines.append("## Articles")
        lines.append("")
        for a in articles:
            lines.append(f"- [[{a['name']}]] — {a['brief']}")
        lines.append("")

    if subdirs:
        lines.append("## Sections")
        lines.append("")
        for d in subdirs:
            lines.append(f"- [[{d}/_index|{d.replace('-', ' ').title()}]]")
        lines.append("")

    (section_dir / "_index.md").write_text("\n".join(lines), encoding="utf-8")


def _generate_master_index(config: Config):
    """Generate a comprehensive wiki/_index.md — full catalog of everything."""
    wiki_path = config.wiki_path
    import json as _json

    lines = ["# Knowledge Base Index", ""]
    lines.append("A complete catalog of everything in this knowledge base.")
    lines.append("")

    # Entity pages
    entities_dir = wiki_path / "entities"
    if entities_dir.exists():
        entity_files = sorted(f for f in entities_dir.glob("*.md") if not f.name.startswith("_"))
        if entity_files:
            lines.append(f"## Entities ({len(entity_files)})")
            lines.append("")
            for f in entity_files:
                brief = _extract_brief(read_markdown(f), f.stem)
                lines.append(f"- [[entities/{f.stem}|{f.stem.replace('-', ' ').title()}]] — {brief}")
            lines.append("")

    # Claims by paper
    graph_path = config.graph_path
    if graph_path.exists():
        graph = _json.loads(graph_path.read_text(encoding="utf-8"))
        nodes = graph.get("nodes", [])

        # Group claims by source paper
        papers = {}
        for n in nodes:
            paper = n.get("source_title", n.get("source_paper", "Unknown"))
            if paper not in papers:
                papers[paper] = []
            papers[paper].append(n)

        lines.append(f"## Claims by Paper ({len(nodes)} total)")
        lines.append("")
        for paper_title, claims in sorted(papers.items()):
            lines.append(f"### {paper_title} ({len(claims)} claims)")
            for c in claims[:5]:
                lines.append(f"- [[claims/{c['id']}]] — {c['text'][:80]}")
            if len(claims) > 5:
                lines.append(f"- ... and {len(claims) - 5} more")
            lines.append("")

        # Clusters
        clusters = graph.get("clusters", [])
        if clusters:
            lines.append(f"## Clusters ({len(clusters)})")
            lines.append("")
            for c in clusters:
                lines.append(f"- **{c.get('label', c['id'])}** — {len(c.get('node_ids', []))} claims — {c.get('description', '')[:80]}")
            lines.append("")

        # Product ideas
        ideas = graph.get("product_ideas", [])
        if ideas:
            lines.append(f"## Product Ideas ({len(ideas)})")
            lines.append("")
            for idea in ideas:
                lines.append(f"- **{idea.get('name', '?')}** — {idea.get('tagline', '')}")
            lines.append("")

    # Source summaries
    sources_dir = wiki_path / "sources"
    if sources_dir.exists():
        source_files = sorted(f for f in sources_dir.glob("*.md") if not f.name.startswith("_"))
        if source_files:
            lines.append(f"## Source Summaries ({len(source_files)})")
            lines.append("")
            for f in source_files:
                brief = _extract_brief(read_markdown(f), f.stem)
                lines.append(f"- [[sources/{f.stem}]] — {brief}")
            lines.append("")

    # Stats
    lines.append("---")
    lines.append(f"*Last updated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}*")
    lines.append("")

    (wiki_path / "_index.md").write_text("\n".join(lines), encoding="utf-8")
    logger.info("Generated master index")


def _generate_wiki_summary(config: Config, llm: LLM, categorization: Optional[Dict[str, Any]] = None):
    """Generate wiki/_summary.md using LLM."""
    wiki_path = config.wiki_path

    # Count stats
    sources_count = len(list((wiki_path / "sources").glob("*.md"))) if (wiki_path / "sources").exists() else 0
    concepts_count = len(list((wiki_path / "concepts").glob("*.md"))) if (wiki_path / "concepts").exists() else 0
    total_articles = sources_count + concepts_count

    topics_data = {}
    if categorization and "topics" in categorization:
        topics_data = categorization["topics"]
    elif (wiki_path / "topics").exists():
        # Reconstruct from directory structure
        for topic_dir in (wiki_path / "topics").iterdir():
            if topic_dir.is_dir():
                slug = topic_dir.name
                index_content = read_markdown(topic_dir / "_index.md")
                topics_data[slug] = {
                    "title": slug.replace("-", " ").title(),
                    "description": "",
                    "concepts": [],
                }

    if not topics_data:
        # Simple summary without LLM
        summary = f"# Knowledge Base Summary\n\nThis wiki contains {sources_count} source summaries and {concepts_count} concept articles.\n"
        (wiki_path / "_summary.md").write_text(summary, encoding="utf-8")
        return

    summary_md = llm.call(
        prompt="",
        template="generate_wiki_summary.md",
        template_vars={
            "topics": topics_data,
            "total_sources": sources_count,
            "total_concepts": concepts_count,
            "total_articles": total_articles,
        },
    )

    (wiki_path / "_summary.md").write_text(f"# Knowledge Base Summary\n\n{summary_md}", encoding="utf-8")
    logger.info("Generated wiki summary")


def _extract_brief(content: str, fallback: str) -> str:
    """Extract the brief/first paragraph from wiki content."""
    in_brief = False
    for line in content.splitlines():
        if line.strip().lower() == "## brief":
            in_brief = True
            continue
        if in_brief and line.strip():
            return line.strip()
        if line.strip().startswith("## ") and in_brief:
            break

    # Fallback: first non-heading, non-empty line after front matter
    past_frontmatter = not content.startswith("---")
    for line in content.splitlines():
        if line.strip() == "---":
            past_frontmatter = not past_frontmatter
            continue
        if past_frontmatter and line.strip() and not line.startswith("#"):
            return line.strip()[:150]

    return fallback.replace("-", " ").title()


def _extract_title_from_content(content: str, fallback: str) -> str:
    """Extract title from content — front matter or first heading."""
    try:
        post = frontmatter.loads(content)
        if "title" in post.metadata:
            return post.metadata["title"]
    except Exception:
        pass

    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()

    return fallback.replace("-", " ").title()
