"""BM25 search engine over wiki claims and graph nodes."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

from rank_bm25 import BM25Okapi

from ..config import Config
from ..utils import read_markdown, strip_frontmatter

logger = logging.getLogger(__name__)

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
    "neither", "each", "every", "all", "any", "few", "more", "most", "other",
    "some", "such", "no", "only", "own", "same", "than", "too", "very",
    "just", "because", "if", "when", "where", "how", "what", "which", "who",
    "this", "that", "these", "those", "it", "its",
}


class SearchEngine:
    def __init__(self, config: Config):
        self.config = config
        self.index_path = config.search_index_path / "index.json"
        self.docstore_path = config.search_index_path / "docstore.json"
        self.bm25: Optional[BM25Okapi] = None
        self.docs: List[Dict] = []
        self._load_index()

    def _load_index(self):
        if self.docstore_path.exists():
            data = json.loads(self.docstore_path.read_text(encoding="utf-8"))
            self.docs = data.get("docs", [])
            if self.docs:
                corpus = [d["tokens"] for d in self.docs]
                self.bm25 = BM25Okapi(corpus)

    def rebuild_index(self):
        """Rebuild search index from wiki .md files AND graph nodes."""
        wiki_path = self.config.wiki_path
        self.docs = []

        # Index all wiki markdown files (including claims/)
        for md_file in sorted(wiki_path.rglob("*.md")):
            rel_path = str(md_file.relative_to(wiki_path))
            content = read_markdown(md_file)
            plain = strip_frontmatter(content)
            plain = re.sub(r"\[{1,2}([^\]]+?)\]{1,2}", r"\1", plain)
            plain = re.sub(r"[#*_`>|~\-]", " ", plain)

            title = self._extract_title(content, md_file.stem)
            tokens = self._tokenize(plain)
            snippet = plain[:200].replace("\n", " ").strip()

            self.docs.append({
                "path": rel_path,
                "title": title,
                "tokens": tokens,
                "snippet": snippet,
                "type": "claim" if "claims/" in rel_path else "wiki",
            })

        # Also index graph nodes directly (richer text from graph.json)
        graph_path = self.config.graph_path
        if graph_path.exists():
            try:
                graph = json.loads(graph_path.read_text(encoding="utf-8"))
                for node in graph.get("nodes", []):
                    text = node.get("text", "")
                    evidence = node.get("evidence", "")
                    tags = " ".join(node.get("tags", []))
                    full_text = f"{text} {evidence} {tags}"
                    tokens = self._tokenize(full_text)

                    self.docs.append({
                        "path": f"claims/{node['id']}.md",
                        "title": text[:80],
                        "tokens": tokens,
                        "snippet": f"{text} — {evidence}"[:200],
                        "type": "graph_node",
                        "node_id": node["id"],
                        "source_paper": node.get("source_title", ""),
                        "claim_type": node.get("type", ""),
                        "cluster": node.get("cluster", ""),
                    })
            except Exception as e:
                logger.warning("Failed to index graph nodes: %s", e)

        if self.docs:
            corpus = [d["tokens"] for d in self.docs]
            self.bm25 = BM25Okapi(corpus)

        # Save index
        self.config.search_index_path.mkdir(parents=True, exist_ok=True)
        self.docstore_path.write_text(
            json.dumps({"docs": self.docs}, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info("Indexed %d documents (%d wiki, %d graph nodes)",
                     len(self.docs),
                     sum(1 for d in self.docs if d.get("type") != "graph_node"),
                     sum(1 for d in self.docs if d.get("type") == "graph_node"))

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """Search wiki + graph. Returns list of {path, title, snippet, score, type}."""
        if not self.bm25 or not self.docs:
            self.rebuild_index()
            if not self.bm25:
                return []

        tokens = self._tokenize(query)
        scores = self.bm25.get_scores(tokens)

        scored = [(i, s) for i, s in enumerate(scores) if s > 0]
        scored.sort(key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in scored[:top_k]:
            doc = self.docs[idx]
            result = {
                "path": doc["path"],
                "title": doc["title"],
                "snippet": doc["snippet"],
                "score": float(score),
                "type": doc.get("type", "wiki"),
            }
            # Add graph-specific fields
            if doc.get("node_id"):
                result["node_id"] = doc["node_id"]
            if doc.get("source_paper"):
                result["source_paper"] = doc["source_paper"]
            if doc.get("cluster"):
                result["cluster"] = doc["cluster"]
            results.append(result)

        return results

    def _tokenize(self, text: str) -> List[str]:
        tokens = re.findall(r"\w+", text.lower())
        return [t for t in tokens if t not in STOPWORDS and len(t) > 1]

    def _extract_title(self, content: str, fallback: str) -> str:
        for line in content.splitlines():
            if line.startswith("# "):
                return line[2:].strip()
        return fallback.replace("-", " ").title()
