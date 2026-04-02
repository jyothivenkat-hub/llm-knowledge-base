"""Manifest manager for tracking ingested source documents."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import yaml


@dataclass
class ManifestEntry:
    path: str
    sha256: str
    title: str
    source_url: str = ""
    date_ingested: str = ""
    compiled: bool = False
    compiled_hash: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> ManifestEntry:
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class Manifest:
    def __init__(self, manifest_path: Path):
        self.path = manifest_path
        self.entries: Dict[str, ManifestEntry] = {}
        self._load()

    def _load(self):
        if self.path.exists():
            data = yaml.safe_load(self.path.read_text(encoding="utf-8")) or {}
            for entry_data in data.get("sources", []):
                entry = ManifestEntry.from_dict(entry_data)
                self.entries[entry.path] = entry

    def save(self):
        data = {"sources": [e.to_dict() for e in self.entries.values()]}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(yaml.dump(data, default_flow_style=False, sort_keys=False), encoding="utf-8")

    def add_entry(self, path: str, sha256: str, title: str, source_url: str = "") -> ManifestEntry:
        entry = ManifestEntry(
            path=path,
            sha256=sha256,
            title=title,
            source_url=source_url,
            date_ingested=datetime.now().strftime("%Y-%m-%d"),
        )
        self.entries[path] = entry
        return entry

    def get_entry(self, path: str) -> Optional[ManifestEntry]:
        return self.entries.get(path)

    def get_uncompiled(self) -> List[ManifestEntry]:
        return [e for e in self.entries.values() if not e.compiled]

    def get_modified(self) -> List[ManifestEntry]:
        return [e for e in self.entries.values() if e.compiled and e.sha256 != e.compiled_hash]

    def mark_compiled(self, path: str, sha256: str):
        if path in self.entries:
            self.entries[path].compiled = True
            self.entries[path].compiled_hash = sha256

    def all_entries(self) -> List[ManifestEntry]:
        return list(self.entries.values())
