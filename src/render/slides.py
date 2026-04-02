"""Generate Marp-format slideshows from wiki articles."""

from __future__ import annotations

import logging
from pathlib import Path

from ..config import Config
from ..utils import read_markdown, ensure_dir, strip_frontmatter

logger = logging.getLogger(__name__)

MARP_HEADER = """---
marp: true
theme: default
paginate: true
---

"""


def render_slides(config: Config, source_path: Path) -> Path:
    """Convert a wiki article into a Marp slideshow.

    Splits content at ## headings into slides.

    Returns the output path.
    """
    # Resolve relative to wiki or absolute
    if not source_path.is_absolute():
        source_path = config.wiki_path / source_path

    content = read_markdown(source_path)
    if not content:
        raise FileNotFoundError(f"File not found: {source_path}")

    plain = strip_frontmatter(content)

    # Split into slides at ## headings
    slides = []
    current_slide = []

    for line in plain.splitlines():
        if line.startswith("## ") and current_slide:
            slides.append("\n".join(current_slide))
            current_slide = []
        current_slide.append(line)

    if current_slide:
        slides.append("\n".join(current_slide))

    # Build Marp markdown
    marp_content = MARP_HEADER
    for i, slide in enumerate(slides):
        if i > 0:
            marp_content += "\n---\n\n"
        marp_content += slide.strip() + "\n"

    # Save
    slides_dir = ensure_dir(config.output_path / "slides")
    output_name = source_path.stem + "-slides.md"
    output_path = slides_dir / output_name
    output_path.write_text(marp_content, encoding="utf-8")

    logger.info("Generated slides: %s (%d slides)", output_path.name, len(slides))
    return output_path
