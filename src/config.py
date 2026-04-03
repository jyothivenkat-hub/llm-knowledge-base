"""Configuration loader for the knowledge base."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Union

import yaml
from dotenv import load_dotenv


@dataclass
class Config:
    vault_path: Path
    anthropic_api_key: str
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 8192
    raw_dir: Path = field(default_factory=lambda: Path("raw"))
    wiki_dir: Path = field(default_factory=lambda: Path("wiki"))
    output_dir: Path = field(default_factory=lambda: Path("output"))
    search_index_dir: Path = field(default_factory=lambda: Path("search_index"))
    search_web_port: int = 8787
    log_level: str = "INFO"

    @property
    def raw_path(self) -> Path:
        return self.vault_path / self.raw_dir

    @property
    def wiki_path(self) -> Path:
        return self.vault_path / self.wiki_dir

    @property
    def output_path(self) -> Path:
        return self.vault_path / self.output_dir

    @property
    def search_index_path(self) -> Path:
        return self.vault_path / self.search_index_dir

    @property
    def templates_path(self) -> Path:
        return self.vault_path / "templates"

    @property
    def prompts_path(self) -> Path:
        return self.templates_path / "prompts"

    @property
    def graph_path(self) -> Path:
        return self.wiki_path / "graph.json"

    @property
    def graph_insights_path(self) -> Path:
        return self.wiki_path / "graph_insights.json"


def load_config(config_path: Optional[Union[str, Path]] = None) -> Config:
    """Load config from YAML file. Searches up from cwd if no path given."""
    if config_path is None:
        config_path = _find_config()
    config_path = Path(config_path).resolve()

    load_dotenv(config_path.parent / ".env", override=True)

    with open(config_path) as f:
        data = yaml.safe_load(f) or {}

    vault_path = (config_path.parent / data.get("vault_path", ".")).resolve()
    api_key_env = data.get("anthropic_api_key_env", "ANTHROPIC_API_KEY")
    api_key = os.environ.get(api_key_env, "")

    return Config(
        vault_path=vault_path,
        anthropic_api_key=api_key,
        model=data.get("model", "claude-sonnet-4-20250514"),
        max_tokens=data.get("max_tokens", 8192),
        raw_dir=Path(data.get("raw_dir", "raw")),
        wiki_dir=Path(data.get("wiki_dir", "wiki")),
        output_dir=Path(data.get("output_dir", "output")),
        search_index_dir=Path(data.get("search_index_dir", "search_index")),
        search_web_port=data.get("search_web_port", 8787),
        log_level=data.get("log_level", "INFO"),
    )


def _find_config() -> Path:
    """Walk up from cwd looking for config.yaml."""
    current = Path.cwd()
    while True:
        candidate = current / "config.yaml"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            raise FileNotFoundError(
                "No config.yaml found. Run from inside the knowledge base vault "
                "or pass --config path/to/config.yaml"
            )
        current = parent
