"""Generate matplotlib charts from structured data in wiki articles."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from ..config import Config
from ..llm import LLM
from ..utils import read_markdown, ensure_dir, strip_frontmatter

logger = logging.getLogger(__name__)

CHART_PROMPT = """Analyze the following wiki article and extract any data that can be visualized as a chart.

Article content:
{content}

If there is chartable data, produce a JSON response with:
{{
  "title": "Chart title",
  "chart_type": "bar" or "line" or "pie",
  "x_label": "X axis label",
  "y_label": "Y axis label",
  "data": {{
    "labels": ["label1", "label2"],
    "values": [1.0, 2.0]
  }}
}}

If there is no data worth charting, respond with:
{{"no_data": true}}
"""


def render_chart(config: Config, source_path: Path) -> Path:
    """Extract data from a wiki article and generate a chart.

    Returns the output path of the generated PNG.
    """
    if not source_path.is_absolute():
        source_path = config.wiki_path / source_path

    content = read_markdown(source_path)
    if not content:
        raise FileNotFoundError(f"File not found: {source_path}")

    llm = LLM(config)
    response = llm.call(
        prompt=CHART_PROMPT.format(content=strip_frontmatter(content)[:3000]),
    )

    # Parse response
    try:
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            json_str = response.split("```")[1].split("```")[0]
        else:
            json_str = response
        chart_data = json.loads(json_str.strip())
    except (json.JSONDecodeError, IndexError):
        raise ValueError("Could not extract chart data from the article.")

    if chart_data.get("no_data"):
        raise ValueError("No chartable data found in the article.")

    # Generate chart
    charts_dir = ensure_dir(config.output_path / "charts")
    output_name = source_path.stem + "-chart.png"
    output_path = charts_dir / output_name

    _create_chart(chart_data, output_path)
    logger.info("Generated chart: %s", output_path.name)
    return output_path


def _create_chart(data: dict, output_path: Path):
    """Create a matplotlib chart from structured data."""
    chart_type = data.get("chart_type", "bar")
    title = data.get("title", "Chart")
    x_label = data.get("x_label", "")
    y_label = data.get("y_label", "")
    labels = data["data"]["labels"]
    values = data["data"]["values"]

    fig, ax = plt.subplots(figsize=(10, 6))

    if chart_type == "bar":
        ax.bar(labels, values, color="#7c83ff")
    elif chart_type == "line":
        ax.plot(labels, values, marker="o", color="#7c83ff")
    elif chart_type == "pie":
        ax.pie(values, labels=labels, autopct="%1.1f%%")

    ax.set_title(title, fontsize=14, fontweight="bold")
    if chart_type != "pie":
        ax.set_xlabel(x_label)
        ax.set_ylabel(y_label)
        plt.xticks(rotation=45, ha="right")

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
