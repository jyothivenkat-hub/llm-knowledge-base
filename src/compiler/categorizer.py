"""Extract concepts from summaries and categorize into topics."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Any

from ..config import Config
from ..llm import LLM
from ..utils import extract_wikilinks, read_markdown, ensure_dir, slugify

logger = logging.getLogger(__name__)


def extract_and_categorize(
    config: Config,
    llm: LLM,
) -> Dict[str, Any]:
    """Extract all concepts from wiki/sources/ and categorize them into topics.

    Returns the categorization structure with topics and concepts.
    """
    sources_dir = config.wiki_path / "sources"
    if not sources_dir.exists():
        return {"topics": {}, "concepts_to_generate": []}

    # Collect all concepts from source summaries
    all_concepts = {}  # concept_slug -> list of source files mentioning it
    summaries_context = []

    for md_file in sorted(sources_dir.glob("*.md")):
        if md_file.name.startswith("_"):
            continue
        content = read_markdown(md_file)
        links = extract_wikilinks(content)

        summaries_context.append(f"### {md_file.stem}\n{content[:1000]}")

        for link in links:
            slug = link.lower().strip()
            if slug not in all_concepts:
                all_concepts[slug] = []
            all_concepts[slug].append(md_file.name)

    if not all_concepts:
        logger.info("No concepts found in source summaries.")
        return {"topics": {}, "concepts_to_generate": []}

    # Format concepts list
    concepts_list = "\n".join(
        f"- {slug} (mentioned in: {', '.join(files)})"
        for slug, files in sorted(all_concepts.items())
    )

    logger.info("Found %d unique concepts across sources", len(all_concepts))

    # Ask LLM to categorize
    response = llm.call(
        prompt="",
        template="extract_concepts.md",
        template_vars={
            "concepts_list": concepts_list,
            "summaries_context": "\n\n".join(summaries_context),
        },
    )

    # Parse JSON response
    try:
        # Extract JSON from response (might be wrapped in ```json blocks)
        json_str = response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        categorization = json.loads(json_str.strip())
    except (json.JSONDecodeError, IndexError) as e:
        logger.error("Failed to parse LLM categorization response: %s", e)
        logger.debug("Response was: %s", response[:500])
        return {"topics": {}, "concepts_to_generate": []}

    return categorization


def generate_concept_articles(
    config: Config,
    llm: LLM,
    categorization: Dict[str, Any],
) -> int:
    """Generate wiki articles for each concept.

    Returns the number of concept articles generated.
    """
    concepts_dir = ensure_dir(config.wiki_path / "concepts")
    sources_dir = config.wiki_path / "sources"
    topics = categorization.get("topics", {})
    concepts_to_gen = categorization.get("concepts_to_generate", [])

    if not concepts_to_gen:
        return 0

    count = 0
    for concept in concepts_to_gen:
        slug = concept["slug"]
        title = concept.get("title", slug.replace("-", " ").title())
        topic_slug = concept.get("topic", "general")
        topic_data = topics.get(topic_slug, {})
        topic_title = topic_data.get("title", topic_slug.replace("-", " ").title())
        source_files = concept.get("sources", [])

        # Gather source content
        sources = []
        for src_file in source_files:
            src_path = sources_dir / src_file
            if not src_path.exists():
                # Try without extension
                src_path = sources_dir / f"{src_file}"
                if not src_path.exists():
                    continue
            sources.append({
                "title": src_path.stem.replace("-", " ").title(),
                "path": f"sources/{src_path.stem}",
                "content": read_markdown(src_path)[:2000],
            })

        if not sources:
            # Still generate with available info
            sources = [{"title": "General", "path": "", "content": concept.get("brief", "")}]

        logger.info("Generating concept article: %s", title)

        article_md = llm.call(
            prompt="",
            template="generate_concept_article.md",
            template_vars={
                "concept_title": title,
                "concept_slug": slug,
                "topic_title": topic_title,
                "topic_slug": topic_slug,
                "sources": sources,
            },
        )

        # Save
        article_path = concepts_dir / f"{slug}.md"
        article_path.write_text(article_md, encoding="utf-8")
        count += 1

    # Create topic directories and move/link concept articles
    for topic_slug, topic_data in topics.items():
        topic_dir = ensure_dir(config.wiki_path / "topics" / topic_slug)
        topic_concepts = topic_data.get("concepts", [])

        # Create a topic index that links to concept articles
        lines = [
            f"# {topic_data.get('title', topic_slug.replace('-', ' ').title())}",
            "",
            topic_data.get("description", ""),
            "",
            "## Concepts",
            "",
        ]
        for c_slug in topic_concepts:
            lines.append(f"- [[{c_slug}]]")

        (topic_dir / "_index.md").write_text("\n".join(lines), encoding="utf-8")

    return count
