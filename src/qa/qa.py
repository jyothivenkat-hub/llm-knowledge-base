"""Agentic Q&A research loop over the wiki."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

from ..config import Config
from ..llm import LLM
from ..utils import read_markdown, ensure_dir
from ..search.engine import SearchEngine

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 5


def run_qa(
    config: Config,
    question: str,
    save: bool = False,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> str:
    """Run the Q&A research loop.

    The LLM navigates the wiki through index files and search,
    reading relevant articles to build up context before answering.

    Returns the answer as markdown text.
    """
    def progress(msg: str):
        logger.info(msg)
        if progress_callback:
            progress_callback(msg)

    llm = LLM(config)
    engine = SearchEngine(config)

    # Start with wiki summary and master index
    context_parts = []

    summary = read_markdown(config.wiki_path / "_summary.md")
    if summary:
        context_parts.append("## Wiki Summary\n" + summary)

    master_index = read_markdown(config.wiki_path / "_index.md")
    if master_index:
        context_parts.append("## Wiki Index\n" + master_index)

    # Add section indexes
    for section in ["sources", "concepts", "topics"]:
        idx = read_markdown(config.wiki_path / section / "_index.md")
        if idx:
            context_parts.append(f"## {section.title()} Index\n" + idx)

    if not context_parts:
        return "The wiki is empty. Run `kb ingest` and `kb compile` first."

    context = "\n\n".join(context_parts)

    progress("Loading wiki indexes...")

    # Agentic research loop
    for iteration in range(1, MAX_ITERATIONS + 1):
        progress(f"Research iteration {iteration}/{MAX_ITERATIONS}...")

        response = llm.call(
            prompt="",
            template="qa_research.md",
            template_vars={
                "question": question,
                "context": context,
                "iteration": iteration,
                "max_iterations": MAX_ITERATIONS,
            },
        )

        # Parse action
        action = _parse_action(response)

        if action["action"] == "answer":
            answer = action.get("content", response)
            if save:
                _save_answer(config, question, answer)
            progress(f"Answer found. {llm.token_usage_summary()}")
            return answer

        elif action["action"] == "read":
            files = action.get("files", [])
            for fpath in files:
                progress(f"Reading: {fpath}")
                full_path = config.wiki_path / fpath
                content = read_markdown(full_path)
                if content:
                    context += f"\n\n## Content of {fpath}\n{content}"
                else:
                    progress(f"  Not found: {fpath}")

        elif action["action"] == "search":
            query = action.get("query", "")
            progress(f"Searching: {query}")
            results = engine.search(query, top_k=5)
            if results:
                search_context = f"\n\n## Search results for '{query}':\n"
                for r in results:
                    search_context += f"- **{r['title']}** ({r['path']}): {r['snippet']}\n"
                context += search_context
                progress(f"  Found {len(results)} results")
            else:
                context += f"\n\nNo search results for '{query}'."
                progress(f"  No results")

    # Shouldn't reach here, but just in case
    return "Could not find a satisfactory answer within the iteration limit."


def _parse_action(response: str) -> dict:
    """Parse the LLM's JSON action response."""
    try:
        # Try direct JSON parse
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from markdown code blocks
    if "```json" in response:
        try:
            json_str = response.split("```json")[1].split("```")[0]
            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError):
            pass

    if "```" in response:
        try:
            json_str = response.split("```")[1].split("```")[0]
            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError):
            pass

    # Try to find JSON object in the response
    for i, ch in enumerate(response):
        if ch == "{":
            depth = 0
            for j in range(i, len(response)):
                if response[j] == "{":
                    depth += 1
                elif response[j] == "}":
                    depth -= 1
                if depth == 0:
                    try:
                        return json.loads(response[i : j + 1])
                    except json.JSONDecodeError:
                        break
            break

    # If all parsing fails, treat as direct answer
    return {"action": "answer", "content": response}


def _save_answer(config: Config, question: str, answer: str):
    """Save a Q&A answer to the output directory."""
    answers_dir = ensure_dir(config.output_path / "answers")
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    slug = question[:50].replace(" ", "-").lower()
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    path = answers_dir / f"{timestamp}-{slug}.md"
    content = f"# Q: {question}\n\n{answer}\n"
    path.write_text(content, encoding="utf-8")
    logger.info("Answer saved to: %s", path)
