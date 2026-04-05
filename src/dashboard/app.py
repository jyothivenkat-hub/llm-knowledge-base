"""Flask web dashboard for the knowledge base."""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from queue import Queue, Empty
from threading import Thread
from typing import Optional

import markdown
import yaml
from flask import Flask, Response, render_template, request, jsonify, send_from_directory

from ..config import Config, load_config
from ..utils import read_markdown, strip_frontmatter

logger = logging.getLogger(__name__)


def create_app(config: Optional[Config] = None) -> Flask:
    if config is None:
        config = load_config()

    app = Flask(
        __name__,
        template_folder=str(Path(__file__).parent / "templates"),
        static_folder=str(Path(__file__).parent / "static"),
    )
    app.config["KB_CONFIG"] = config

    md = markdown.Markdown(extensions=["tables", "fenced_code", "toc"])

    def render_md(text: str) -> str:
        """Render markdown to HTML, converting [[wikilinks]] to dashboard links."""
        # Convert [[wikilinks]] to HTML links
        text = re.sub(
            r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]",
            lambda m: f'<a href="/wiki/find/{m.group(1)}">{m.group(2) or m.group(1)}</a>',
            text,
        )
        md.reset()
        return md.convert(text)

    def get_stats() -> dict:
        cfg = config
        raw_files = [f for f in cfg.raw_path.rglob("*") if f.is_file() and not f.name.startswith("_") and "images" not in f.parts]
        wiki_files = [f for f in cfg.wiki_path.rglob("*.md") if not f.name.startswith("_")]
        concepts = list((cfg.wiki_path / "concepts").rglob("*.md")) if (cfg.wiki_path / "concepts").exists() else []
        topics = [d for d in (cfg.wiki_path / "topics").iterdir() if d.is_dir()] if (cfg.wiki_path / "topics").exists() else []
        total_words = sum(len(f.read_text(encoding="utf-8").split()) for f in wiki_files)
        return {
            "raw_sources": len(raw_files),
            "wiki_articles": len(wiki_files),
            "concepts": len(concepts),
            "topics": len(topics),
            "wiki_words": total_words,
            "model": cfg.model,
            "api_key": bool(cfg.anthropic_api_key),
        }

    # ─── Pages ───────────────────────────────────────────────

    @app.route("/")
    def home():
        stats = get_stats()
        # Add graph stats
        stats["claims"] = 0
        stats["edges"] = 0
        stats["clusters"] = 0
        if config.graph_path.exists():
            graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
            meta = graph.get("metadata", {})
            stats["claims"] = meta.get("total_nodes", 0)
            stats["edges"] = meta.get("total_edges", 0)
            stats["clusters"] = meta.get("total_clusters", 0)
            stats["ideas"] = meta.get("total_product_ideas", len(graph.get("product_ideas", [])))
        return render_template("dashboard.html", active="home", stats=stats)

    @app.route("/ingest")
    def ingest_page():
        from ..ingest.manifest import Manifest
        manifest = Manifest(config.raw_path / "_manifest.yaml")
        entries = manifest.all_entries()
        return render_template("ingest.html", active="ingest", entries=entries)

    @app.route("/compile")
    def compile_page():
        from ..ingest.manifest import Manifest
        manifest = Manifest(config.raw_path / "_manifest.yaml")
        uncompiled = len(manifest.get_uncompiled())
        stale = len(manifest.get_modified())
        wiki_count = len(list(config.wiki_path.rglob("*.md"))) if config.wiki_path.exists() else 0
        # Graph stats
        graph_claims = graph_edges = graph_clusters = 0
        if config.graph_path.exists():
            graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
            meta = graph.get("metadata", {})
            graph_claims = meta.get("total_nodes", 0)
            graph_edges = meta.get("total_edges", 0)
            graph_clusters = meta.get("total_clusters", 0)
        return render_template("compile.html", active="compile",
                               uncompiled=uncompiled, stale=stale, wiki_count=wiki_count,
                               graph_claims=graph_claims, graph_edges=graph_edges,
                               graph_clusters=graph_clusters)

    @app.route("/qa")
    def qa_page():
        answers_dir = config.output_path / "answers"
        history = []
        if answers_dir.exists():
            for f in sorted(answers_dir.glob("*.md"), reverse=True)[:10]:
                first_line = f.read_text(encoding="utf-8").split("\n")[0]
                title = first_line[5:] if first_line.startswith("# Q: ") else f.stem
                history.append({"title": title, "date": f.stem[:10],
                                "path": str(f.relative_to(config.vault_path))})
        return render_template("qa.html", active="qa", history=history)

    @app.route("/search")
    def search_page():
        return render_template("search.html", active="search")

    @app.route("/wiki/", defaults={"path": ""})
    @app.route("/wiki/<path:path>")
    def wiki_page(path):
        wiki_path = config.wiki_path
        target = wiki_path / path if path else wiki_path

        # Build breadcrumb
        breadcrumb = []
        if path:
            parts = Path(path).parts
            for i, p in enumerate(parts):
                breadcrumb.append({"name": p, "path": "/".join(parts[:i+1])})

        # Load graph data (used by multiple views)
        graph_data = {"nodes": [], "edges": [], "clusters": [], "metadata": {}}
        if config.graph_path.exists():
            graph_data = json.loads(config.graph_path.read_text(encoding="utf-8"))
        graph_nodes = graph_data.get("nodes", [])
        graph_edges = graph_data.get("edges", [])
        graph_clusters = graph_data.get("clusters", [])
        graph_meta = graph_data.get("metadata", {})

        # Build cluster list for sidebar (all views)
        clusters_for_sidebar = [c for c in graph_clusters if c.get("id") != "other"]

        # Library landing page (wiki root)
        if not path or path == "":
            papers = []

            # Build paper list from manifest
            from ..ingest.manifest import Manifest
            manifest = Manifest(config.raw_path / "_manifest.yaml")
            for entry in manifest.all_entries():
                claim_count = sum(1 for n in graph_nodes if entry.path in n.get("source_paper", ""))
                source_type = "PDF" if entry.path.endswith(".pdf") else "Article"
                slug_name = entry.path.split("/")[-1].rsplit(".", 1)[0]
                wiki_source = None
                for f in (wiki_path / "sources").glob("*.md"):
                    if slug_name.lower() in f.stem.lower():
                        wiki_source = str(f.relative_to(wiki_path))
                        break
                papers.append({
                    "title": entry.title,
                    "path": wiki_source or f"sources/{slug_name}.md",
                    "claim_count": claim_count,
                    "source_type": source_type,
                })

            # Claims summary
            type_counts = {}
            for n in graph_nodes:
                t = n.get("type", "claim")
                type_counts[t] = type_counts.get(t, 0) + 1

            claims_summary = {
                "total": len(graph_nodes),
                "findings": type_counts.get("finding", 0),
                "methods": type_counts.get("method", 0),
            }

            # Build cluster sections for the Wikipedia article
            node_map = {n["id"]: n for n in graph_nodes}
            cluster_sections = []
            for cluster in graph_clusters:
                if cluster.get("id") == "other":
                    # Include "other" but with a friendlier label
                    cluster_label = "Additional Research"
                    cluster_desc = "Additional claims and findings from various research papers that span multiple research areas."
                else:
                    cluster_label = cluster.get("label", cluster.get("id", ""))
                    cluster_desc = cluster.get("description", "")

                cluster_node_ids = set(cluster.get("node_ids", []))
                cluster_nodes = [node_map[nid] for nid in cluster_node_ids if nid in node_map]

                # Separate by type
                findings = [n for n in cluster_nodes if n.get("type") == "finding"]
                methods = [n for n in cluster_nodes if n.get("type") == "method"]
                concepts = [n for n in cluster_nodes if n.get("type") in ("concept",)]
                hypotheses = [n for n in cluster_nodes if n.get("type") == "hypothesis"]
                claims = [n for n in cluster_nodes if n.get("type") == "claim"]

                # Find cross-cluster connections
                connections = []
                for edge in graph_edges:
                    src_id = edge.get("source_id", "")
                    tgt_id = edge.get("target_id", "")
                    if src_id in cluster_node_ids and tgt_id not in cluster_node_ids:
                        src_node = node_map.get(src_id, {})
                        tgt_node = node_map.get(tgt_id, {})
                        if src_node and tgt_node:
                            connections.append({
                                "relationship": edge.get("relationship", "related"),
                                "source_text": src_node.get("text", ""),
                                "target_text": tgt_node.get("text", ""),
                                "rationale": edge.get("rationale", ""),
                            })
                    elif tgt_id in cluster_node_ids and src_id not in cluster_node_ids:
                        src_node = node_map.get(src_id, {})
                        tgt_node = node_map.get(tgt_id, {})
                        if src_node and tgt_node:
                            connections.append({
                                "relationship": edge.get("relationship", "related"),
                                "source_text": src_node.get("text", ""),
                                "target_text": tgt_node.get("text", ""),
                                "rationale": edge.get("rationale", ""),
                            })

                # Deduplicate connections and limit
                seen_conn = set()
                unique_connections = []
                for c in connections:
                    key = (c["source_text"][:40], c["target_text"][:40])
                    if key not in seen_conn:
                        seen_conn.add(key)
                        unique_connections.append(c)
                connections = unique_connections[:5]

                # Build subsections list for TOC
                subsections = []
                if findings:
                    subsections.append({"id": f"{cluster['id']}-findings", "label": "Key findings"})
                if methods:
                    subsections.append({"id": f"{cluster['id']}-methods", "label": "Methods and approaches"})
                if concepts:
                    subsections.append({"id": f"{cluster['id']}-concepts", "label": "Key concepts"})
                if connections:
                    subsections.append({"id": f"{cluster['id']}-connections", "label": "Connections to other areas"})

                # Combine findings with hypotheses and claims for display
                key_findings = findings + hypotheses + claims

                cluster_sections.append({
                    "id": cluster.get("id", ""),
                    "label": cluster_label,
                    "description": cluster_desc,
                    "key_findings": key_findings[:10],
                    "methods": methods[:8],
                    "concepts": concepts[:8],
                    "connections": connections,
                    "subsections": subsections,
                    "total_claims": len(cluster_nodes),
                })

            built_at = graph_meta.get("built_at", "")
            if built_at:
                try:
                    dt = datetime.fromisoformat(built_at)
                    built_at = dt.strftime("%B %d, %Y at %H:%M")
                except (ValueError, TypeError):
                    pass

            product_ideas = graph_data.get("product_ideas", [])

            return render_template("wiki.html", active="wiki", is_dir=True,
                                   is_library_root=True, papers=papers,
                                   claims_summary=claims_summary,
                                   cluster_sections=cluster_sections,
                                   clusters=clusters_for_sidebar,
                                   product_ideas=product_ideas,
                                   total_edges=graph_meta.get("total_edges", 0),
                                   total_sources=len(papers),
                                   built_at=built_at)

        # Regular directory browse
        if target.is_dir():
            items = []
            for item in sorted(target.iterdir()):
                if item.name.startswith("."):
                    continue
                rel = str(item.relative_to(wiki_path))
                brief = ""
                if item.is_file() and item.suffix == ".md":
                    content = read_markdown(item)
                    for line in strip_frontmatter(content).splitlines():
                        line = line.strip()
                        if line and not line.startswith("#") and not line.startswith("---"):
                            brief = line[:120]
                            break
                items.append({"name": item.name, "path": rel, "is_dir": item.is_dir(), "brief": brief})
            return render_template("wiki.html", active="wiki", is_dir=True,
                                   is_library_root=False, dir_name=Path(path).name.title(),
                                   items=items, breadcrumb=breadcrumb,
                                   clusters=clusters_for_sidebar,
                                   total_sources=len(graph_nodes))

        # Single article view
        if target.exists() and target.suffix == ".md":
            content = read_markdown(target)
            html = render_md(strip_frontmatter(content))

            # Extract title
            article_title = target.stem.replace("-", " ").title()
            for line in content.splitlines():
                if line.startswith("# "):
                    article_title = line[2:].strip()
                    break

            # Find claims from this paper
            article_claims = []
            article_source = ""
            for n in graph_nodes:
                sp = n.get("source_paper", "")
                if target.stem.lower() in sp.lower() or sp.lower() in str(target).lower():
                    article_claims.append(n)

            # Load backlinks
            backlinks = []
            bl_path = wiki_path / "_backlinks.yaml"
            if bl_path.exists():
                bl_data = yaml.safe_load(bl_path.read_text(encoding="utf-8")) or {}
                backlinks = bl_data.get(target.stem.lower(), [])

            wiki_rel_path = str(target.relative_to(wiki_path))
            return render_template("wiki.html", active="wiki", is_dir=False,
                                   is_article=True, article_title=article_title,
                                   article_source=article_source,
                                   article_claims=article_claims,
                                   content=html, breadcrumb=breadcrumb,
                                   backlinks=backlinks,
                                   wiki_path_rel=wiki_rel_path,
                                   clusters=clusters_for_sidebar,
                                   total_sources=graph_meta.get("papers_processed", 0))

        return "Not found", 404

    @app.route("/wiki/find/<name>")
    def wiki_find(name):
        """Resolve a wikilink name to the actual file path."""
        slug = name.lower().strip()
        for md_file in config.wiki_path.rglob("*.md"):
            if md_file.stem.lower() == slug:
                rel = str(md_file.relative_to(config.wiki_path))
                return Response("", status=302, headers={"Location": f"/wiki/{rel}"})
        return f"Article not found: {name}", 404

    @app.route("/graph")
    def graph_page():
        has_graph = config.graph_path.exists()
        return render_template("graph.html", active="graph", has_graph=has_graph)

    @app.route("/ideas")
    def ideas_page():
        ideas = []
        if config.graph_path.exists():
            graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
            ideas = graph.get("product_ideas", [])
        return render_template("ideas.html", active="ideas", ideas=ideas)

    @app.route("/render")
    def render_page():
        wiki_files = []
        for f in sorted(config.wiki_path.rglob("*.md")):
            if not f.name.startswith("_"):
                wiki_files.append(str(f.relative_to(config.wiki_path)))
        return render_template("render.html", active="render", wiki_files=wiki_files)

    @app.route("/lint")
    def lint_page():
        return render_template("lint.html", active="lint")

    # ─── API Endpoints ───────────────────────────────────────

    @app.route("/api/search")
    def api_search():
        from ..search.engine import SearchEngine
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"results": []})
        engine = SearchEngine(config)
        results = engine.search(query)
        return jsonify({"query": query, "results": results})

    @app.route("/api/graph")
    def api_graph():
        if config.graph_path.exists():
            return jsonify(json.loads(config.graph_path.read_text(encoding="utf-8")))
        return jsonify({"nodes": [], "edges": [], "clusters": [], "metadata": {}})

    @app.route("/api/graph/insights")
    def api_graph_insights():
        if config.graph_insights_path.exists():
            return jsonify(json.loads(config.graph_insights_path.read_text(encoding="utf-8")))
        return jsonify({})

    @app.route("/api/graph/node/<node_id>")
    def api_graph_node(node_id):
        if not config.graph_path.exists():
            return jsonify({"error": "No graph"}), 404
        graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
        node = next((n for n in graph["nodes"] if n["id"] == node_id), None)
        if not node:
            return jsonify({"error": "Node not found"}), 404
        edges = [e for e in graph["edges"] if e["source_id"] == node_id or e["target_id"] == node_id]
        neighbor_ids = set()
        for e in edges:
            neighbor_ids.add(e["source_id"])
            neighbor_ids.add(e["target_id"])
        neighbors = [n for n in graph["nodes"] if n["id"] in neighbor_ids]
        return jsonify({"node": node, "edges": edges, "neighbors": neighbors})

    @app.route("/api/graph/search")
    def api_graph_search():
        query = request.args.get("q", "").strip().lower()
        if not query or not config.graph_path.exists():
            return jsonify({"results": []})
        graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
        results = []
        for n in graph["nodes"]:
            score = 0
            if query in n["text"].lower():
                score += 2
            for tag in n.get("tags", []):
                if query in tag.lower():
                    score += 1
            if score > 0:
                results.append({**n, "score": score})
        results.sort(key=lambda x: x["score"], reverse=True)
        return jsonify({"results": results[:20]})

    @app.route("/api/mode")
    def api_mode():
        """Returns whether the app is in demo mode (no API key)."""
        has_key = bool(config.anthropic_api_key and config.anthropic_api_key != "your-api-key-here")
        return jsonify({"demo": not has_key, "model": config.model})

    @app.route("/api/sources", methods=["GET", "POST"])
    def api_sources():
        """List known sources or create a new markdown source in raw/articles/."""
        from ..ingest.manifest import Manifest
        from ..utils import slugify

        manifest = Manifest(config.raw_path / "_manifest.yaml")

        if request.method == "POST":
            data = request.get_json() or {}
            title = (data.get("title") or "").strip()
            content = (data.get("content") or "").strip()
            source_type = (data.get("type") or "article").strip()
            source_url = (data.get("source_url") or "").strip()

            if not title or not content:
                return jsonify({"error": "Missing title or content"}), 400

            timestamp = datetime.now().strftime("%Y%m%d")
            slug = slugify(title)[:60]
            filename = f"{timestamp}-{slug}.md"
            dest = config.raw_path / "articles" / filename
            dest.parent.mkdir(parents=True, exist_ok=True)

            header = [
                "---",
                f'title: "{title}"',
                f'date: "{datetime.now().strftime("%Y-%m-%d")}"',
                f'type: "{source_type}"',
            ]
            if source_url:
                header.append(f'url: "{source_url}"')
            header.extend(["---", "", f"# {title}", "", content, ""])
            dest.write_text("\n".join(header), encoding="utf-8")

            return jsonify({
                "created": True,
                "path": f"articles/{filename}",
                "title": title,
                "type": source_type,
                "dateAdded": datetime.now().strftime("%Y-%m-%d"),
            })

        # Build wiki slug lookup
        wiki_slugs = {}
        sources_dir = config.wiki_path / "sources"
        if sources_dir.exists():
            for f in sources_dir.glob("*.md"):
                if not f.name.startswith("_"):
                    wiki_slugs[f.stem.lower()] = f.stem

        items = []
        for entry in manifest.all_entries():
            status = "pending"
            if entry.compiled and entry.sha256 == entry.compiled_hash:
                status = "completed"
            elif entry.compiled:
                status = "processing"

            suffix = Path(entry.path).suffix.lower()
            source_type = "pdf" if suffix == ".pdf" else "article"

            # Find matching wiki source file
            wiki_slug = ""
            raw_stem = Path(entry.path).stem.lower()
            title_slug = slugify(entry.title).lower()
            for ws_lower, ws in wiki_slugs.items():
                if raw_stem in ws_lower or title_slug in ws_lower or ws_lower in title_slug:
                    wiki_slug = ws
                    break

            items.append({
                "id": entry.path,
                "title": entry.title,
                "type": source_type,
                "content": "",
                "status": status,
                "dateAdded": entry.date_ingested,
                "source_url": entry.source_url,
                "wiki_slug": wiki_slug,
            })

        return jsonify({"sources": items})

    @app.route("/api/wiki-page")
    def api_wiki_page():
        """Return the full compiled wiki landing page data — same rich structure Flask uses.
        This is the single source of truth for the React WikiView.
        """
        if not config.graph_path.exists():
            return jsonify({"empty": True})

        graph_data = json.loads(config.graph_path.read_text(encoding="utf-8"))
        graph_nodes = graph_data.get("nodes", [])
        graph_edges = graph_data.get("edges", [])
        graph_clusters = graph_data.get("clusters", [])
        graph_meta = graph_data.get("metadata", {})
        product_ideas = graph_data.get("product_ideas", [])

        # Sources from manifest
        from ..ingest.manifest import Manifest
        from ..utils import slugify
        manifest = Manifest(config.raw_path / "_manifest.yaml")

        # Build wiki slug lookup
        wiki_slugs = {}
        sources_dir = config.wiki_path / "sources"
        if sources_dir.exists():
            for f in sources_dir.glob("*.md"):
                if not f.name.startswith("_"):
                    wiki_slugs[f.stem.lower()] = f.stem

        papers = []
        for entry in manifest.all_entries():
            claim_count = sum(1 for n in graph_nodes if entry.path in n.get("source_paper", ""))
            source_type = "PDF" if entry.path.endswith(".pdf") else "Article"
            raw_stem = Path(entry.path).stem.lower()
            title_slug = slugify(entry.title).lower()
            wiki_slug = ""
            for ws_lower, ws in wiki_slugs.items():
                if raw_stem in ws_lower or title_slug in ws_lower or ws_lower in title_slug:
                    wiki_slug = ws
                    break
            papers.append({
                "title": entry.title,
                "raw_path": entry.path,
                "wiki_slug": wiki_slug,
                "claim_count": claim_count,
                "source_type": source_type,
                "source_url": entry.source_url,
                "date_added": entry.date_ingested,
            })

        # Claims summary
        type_counts = {}
        for n in graph_nodes:
            t = n.get("type", "claim")
            type_counts[t] = type_counts.get(t, 0) + 1

        # Build rich cluster sections (same logic as Flask wiki route)
        node_map = {n["id"]: n for n in graph_nodes}
        cluster_sections = []
        for cluster in graph_clusters:
            cid = cluster.get("id", "")
            if cid == "other":
                cluster_label = "Additional Research"
                cluster_desc = "Additional claims and findings from various research papers."
            else:
                cluster_label = cluster.get("label", cid)
                cluster_desc = cluster.get("description", "")

            cluster_node_ids = set(cluster.get("node_ids", []))
            cluster_nodes = [node_map[nid] for nid in cluster_node_ids if nid in node_map]

            findings = [n for n in cluster_nodes if n.get("type") == "finding"]
            methods = [n for n in cluster_nodes if n.get("type") == "method"]
            concepts = [n for n in cluster_nodes if n.get("type") in ("concept",)]
            hypotheses = [n for n in cluster_nodes if n.get("type") == "hypothesis"]
            claims = [n for n in cluster_nodes if n.get("type") == "claim"]

            # Cross-cluster connections
            connections = []
            for edge in graph_edges:
                src_id = edge.get("source_id", "")
                tgt_id = edge.get("target_id", "")
                if (src_id in cluster_node_ids) != (tgt_id in cluster_node_ids):
                    src_node = node_map.get(src_id, {})
                    tgt_node = node_map.get(tgt_id, {})
                    if src_node and tgt_node:
                        key = (src_node.get("text", "")[:40], tgt_node.get("text", "")[:40])
                        connections.append({
                            "relationship": edge.get("relationship", "related"),
                            "source_text": src_node.get("text", ""),
                            "target_text": tgt_node.get("text", ""),
                            "explanation": edge.get("explanation", ""),
                        })

            # Deduplicate
            seen = set()
            unique_conn = []
            for c in connections:
                k = (c["source_text"][:40], c["target_text"][:40])
                if k not in seen:
                    seen.add(k)
                    unique_conn.append(c)
            connections = unique_conn[:5]

            key_findings = findings + hypotheses + claims

            cluster_sections.append({
                "id": cid,
                "label": cluster_label,
                "description": cluster_desc,
                "key_findings": [{"text": n["text"], "source_title": n.get("source_title", ""), "type": n.get("type", "")} for n in key_findings[:10]],
                "methods": [{"text": n["text"], "evidence": n.get("evidence", ""), "type": n.get("type", "")} for n in methods[:8]],
                "concepts": [{"text": n["text"], "source_title": n.get("source_title", ""), "type": n.get("type", "")} for n in concepts[:8]],
                "connections": connections,
                "total_claims": len(cluster_nodes),
            })

        # Insights
        insights = {}
        if config.graph_insights_path.exists():
            insights = json.loads(config.graph_insights_path.read_text(encoding="utf-8"))

        # Source summaries (actual compiled article content)
        source_articles = []
        if sources_dir.exists():
            for f in sorted(sources_dir.glob("*.md")):
                if f.name.startswith("_"):
                    continue
                content = f.read_text(encoding="utf-8")
                # Strip frontmatter
                if content.startswith("---"):
                    end = content.find("---", 3)
                    if end != -1:
                        content = content[end + 3:].strip()
                source_articles.append({
                    "slug": f.stem,
                    "content": content[:2000],
                })

        built_at = graph_meta.get("built_at", "")

        return jsonify({
            "papers": papers,
            "claims_summary": {
                "total": len(graph_nodes),
                "findings": type_counts.get("finding", 0),
                "methods": type_counts.get("method", 0),
                "concepts": type_counts.get("concept", 0),
                "hypotheses": type_counts.get("hypothesis", 0),
                "claims": type_counts.get("claim", 0),
            },
            "cluster_sections": cluster_sections,
            "product_ideas": product_ideas,
            "insights": insights,
            "source_articles": source_articles,
            "total_edges": graph_meta.get("total_edges", 0),
            "built_at": built_at,
        })

    @app.route("/raw/<path:filepath>")
    def serve_raw(filepath):
        """Serve raw source files (PDFs, markdown) for viewing."""
        from flask import send_from_directory
        return send_from_directory(str(config.raw_path), filepath)

    @app.route("/api/cached-search")
    def api_cached_search():
        """Serve pre-computed answers for demo mode (zero API cost)."""
        question = request.args.get("q", "").strip().lower()
        if not question:
            return jsonify({"error": "No question"})

        # Load cached answers
        cached_path = Path(__file__).parent / "static" / "cached_answers.json"
        if not cached_path.exists():
            return jsonify({"error": "No cached answers available"})

        cached = json.loads(cached_path.read_text(encoding="utf-8"))

        # Exact match
        if question in cached:
            entry = cached[question]
            return jsonify({"answer": entry["answer"], "evidence": entry["evidence"], "cached": True})

        # Fuzzy match — find best matching question
        best_match = None
        best_score = 0
        query_words = set(question.split())
        for key, entry in cached.items():
            key_words = set(key.split())
            overlap = len(query_words & key_words)
            if overlap > best_score:
                best_score = overlap
                best_match = entry

        if best_match and best_score >= 2:
            return jsonify({"answer": best_match["answer"], "evidence": best_match["evidence"],
                           "cached": True, "matched_question": best_match["question"]})

        # List available questions
        available = [v["question"] for v in cached.values()]
        return jsonify({"error": "No cached answer for this question. Try one of the suggested questions.",
                       "available_questions": available})

    @app.route("/api/smart-search")
    def api_smart_search():
        """Find relevant claims, gather graph context, synthesize answer via LLM."""
        question = request.args.get("q", "").strip()
        if not question:
            return jsonify({"error": "No question"})

        def generate():
            queue = Queue()

            def run():
                try:
                    from ..search.engine import SearchEngine
                    from ..llm import LLM

                    queue.put({"message": f"Searching for: {question}"})

                    # Step 1: BM25 search for relevant claims
                    engine = SearchEngine(config)
                    results = engine.search(question, top_k=20)
                    queue.put({"message": f"Found {len(results)} relevant claims"})

                    # Step 2: Load graph for connections
                    graph_nodes = {}
                    graph_edges = []
                    insights_list = []

                    if config.graph_path.exists():
                        graph_data = json.loads(config.graph_path.read_text(encoding="utf-8"))
                        graph_nodes = {n["id"]: n for n in graph_data.get("nodes", [])}
                        graph_edges = graph_data.get("edges", [])

                    # If BM25 found nothing, use graph nodes directly
                    if not results and graph_nodes:
                        queue.put({"message": "BM25 returned no matches, using graph nodes directly..."})
                        # Sample top nodes from the graph
                        all_nodes = list(graph_nodes.values())
                        for n in all_nodes[:15]:
                            results.append({
                                "path": f"claims/{n['id']}.md",
                                "title": n.get("text", "")[:80],
                                "snippet": n.get("text", "") + " — " + n.get("evidence", ""),
                                "score": 1.0,
                                "type": "graph_node",
                                "node_id": n["id"],
                                "source_paper": n.get("source_title", ""),
                                "claim_type": n.get("type", ""),
                            })
                        queue.put({"message": f"Using {len(results)} graph nodes as context"})

                    if not results:
                        queue.put({"done": True, "answer_html": "No claims in the knowledge base yet. Upload sources and compile first.", "evidence": []})
                        return

                    if config.graph_insights_path.exists():
                        insights_data = json.loads(config.graph_insights_path.read_text(encoding="utf-8"))
                        for c in insights_data.get("contradictions", []):
                            insights_list.append(f"Contradiction: {c.get('description', '')}")
                        for s in insights_data.get("synthesis", []):
                            insights_list.append(f"Synthesis: {s.get('insight', '')}")

                    # Step 3: Gather claim details + their connections
                    claim_ids = set()
                    claims_for_prompt = []
                    for r in results:
                        nid = r.get("node_id", "")
                        if nid and nid in graph_nodes:
                            node = graph_nodes[nid]
                            claims_for_prompt.append(node)
                            claim_ids.add(nid)
                        else:
                            # Wiki result — still useful
                            claims_for_prompt.append({
                                "id": r.get("path", ""),
                                "text": r.get("title", ""),
                                "type": r.get("type", "wiki"),
                                "source_paper": r.get("source_paper", r.get("path", "")),
                                "evidence": r.get("snippet", ""),
                            })

                    # Find connections between found claims
                    relevant_edges = [
                        e for e in graph_edges
                        if e.get("source_id") in claim_ids or e.get("target_id") in claim_ids
                    ]
                    queue.put({"message": f"Found {len(relevant_edges)} connections between claims"})

                    # Step 4: Synthesize with LLM
                    queue.put({"message": "Synthesizing answer with Opus..."})
                    llm_instance = LLM(config)

                    answer_md = llm_instance.call(
                        prompt="",
                        template="synthesize_search.md",
                        template_vars={
                            "question": question,
                            "claims": claims_for_prompt[:15],
                            "connections": relevant_edges[:20],
                            "insights": insights_list[:10],
                        },
                        max_tokens=4096,
                    )

                    answer_html = render_md(answer_md)

                    # Build evidence trail
                    evidence = []
                    for r in results[:15]:
                        evidence.append({
                            "path": r.get("path", ""),
                            "title": r.get("title", ""),
                            "snippet": r.get("snippet", ""),
                            "score": r.get("score", 0),
                            "type": r.get("claim_type", r.get("type", "")),
                            "source_paper": r.get("source_paper", ""),
                        })

                    queue.put({
                        "done": True,
                        "answer_html": answer_html,
                        "evidence": evidence,
                    })

                except Exception as e:
                    queue.put({"error": str(e), "done": True})

            thread = Thread(target=run, daemon=True)
            thread.start()

            while True:
                try:
                    item = queue.get(timeout=120)
                    yield f"data: {json.dumps(item)}\n\n"
                    if item.get("done") or item.get("error"):
                        break
                except Empty:
                    yield f"data: {json.dumps({'message': 'Still synthesizing...'})}\n\n"

        return Response(generate(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.route("/api/wiki/save", methods=["POST"])
    def api_wiki_save():
        """Save edited markdown content back to a wiki file."""
        data = request.get_json()
        wiki_file = data.get("path", "")
        content = data.get("content", "")
        if not wiki_file or not content:
            return jsonify({"error": "Missing path or content"})

        target = config.wiki_path / wiki_file
        if not target.exists():
            return jsonify({"error": "File not found"}), 404

        # Safety: only allow editing within wiki/
        try:
            target.resolve().relative_to(config.wiki_path.resolve())
        except ValueError:
            return jsonify({"error": "Invalid path"}), 403

        target.write_text(content, encoding="utf-8")
        return jsonify({"saved": True, "path": wiki_file})

    @app.route("/api/wiki/raw")
    def api_wiki_raw():
        """Get raw markdown content of a wiki file for editing."""
        wiki_file = request.args.get("path", "")
        if not wiki_file:
            return jsonify({"error": "Missing path"})
        target = config.wiki_path / wiki_file
        if not target.exists():
            return jsonify({"error": "File not found"}), 404
        return jsonify({"path": wiki_file, "content": target.read_text(encoding="utf-8")})

    @app.route("/api/clip", methods=["POST"])
    def api_clip():
        """Receive clipped web content from the bookmarklet and save to raw/articles/."""
        data = request.get_json()
        title = data.get("title", "Untitled")
        url = data.get("url", "")
        content = data.get("content", "")
        if not content:
            return jsonify({"error": "No content"})

        from ..utils import slugify
        slug = slugify(title)[:60]
        timestamp = datetime.now().strftime("%Y%m%d")
        filename = f"{timestamp}-{slug}.md"
        dest = config.raw_path / "articles" / filename
        dest.parent.mkdir(parents=True, exist_ok=True)

        md = f"---\ntitle: \"{title}\"\nurl: \"{url}\"\ndate: \"{datetime.now().strftime('%Y-%m-%d')}\"\n---\n\n# {title}\n\n{content}\n"
        dest.write_text(md, encoding="utf-8")

        return jsonify({"clipped": filename, "path": f"articles/{filename}"})

    @app.route("/api/file-back", methods=["POST"])
    def api_file_back():
        """File a Q&A answer or output back into raw/ for recompilation into the wiki."""
        data = request.get_json()
        content = data.get("content", "")
        title = data.get("title", "research-note")
        if not content:
            return jsonify({"error": "No content"})

        from ..utils import slugify
        slug = slugify(title)[:60]
        timestamp = datetime.now().strftime("%Y%m%d")
        filename = f"{timestamp}-{slug}.md"
        dest = config.raw_path / "articles" / filename
        dest.parent.mkdir(parents=True, exist_ok=True)

        md = f"---\ntitle: \"{title}\"\ndate: \"{datetime.now().strftime('%Y-%m-%d')}\"\ntype: research-note\n---\n\n{content}\n"
        dest.write_text(md, encoding="utf-8")

        return jsonify({"filed": filename, "path": f"articles/{filename}"})

    @app.route("/api/ingest", methods=["POST"])
    def api_ingest():
        from ..ingest.ingest import run_ingest
        stats = run_ingest(config)
        return jsonify(stats)

    @app.route("/api/upload", methods=["POST"])
    def api_upload():
        files = request.files.getlist("files")
        articles_dir = config.raw_path / "articles"
        articles_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for f in files:
            if f.filename:
                dest = articles_dir / f.filename
                f.save(str(dest))
                count += 1
        return jsonify({"count": count})

    @app.route("/api/compile/stream")
    def api_compile_stream():
        full = request.args.get("full") == "1"

        def generate():
            queue = Queue()
            result = {}

            def progress(msg):
                queue.put({"message": msg})

            def run():
                try:
                    from ..compiler.compiler import run_compile
                    stats = run_compile(config, full=full, progress_callback=progress)
                    queue.put({"done": True, "message": "Compilation complete!", "stats": stats})
                except Exception as e:
                    queue.put({"error": str(e), "done": True})

            thread = Thread(target=run, daemon=True)
            thread.start()

            while True:
                try:
                    item = queue.get(timeout=60)
                    yield f"data: {json.dumps(item)}\n\n"
                    if item.get("done") or item.get("error"):
                        break
                except Empty:
                    yield f"data: {json.dumps({'message': 'Still working...'})}\n\n"

        return Response(generate(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.route("/api/qa/stream")
    def api_qa_stream():
        question = request.args.get("q", "").strip()
        if not question:
            return jsonify({"error": "No question provided"})

        def generate():
            queue = Queue()

            def progress(msg):
                queue.put({"message": msg})

            def run():
                try:
                    from ..qa.qa import run_qa
                    answer = run_qa(config, question, save=True, progress_callback=progress)
                    answer_html = render_md(answer)
                    queue.put({"done": True, "message": "Answer ready!", "answer": answer_html})
                except Exception as e:
                    queue.put({"error": str(e), "done": True})

            thread = Thread(target=run, daemon=True)
            thread.start()

            while True:
                try:
                    item = queue.get(timeout=120)
                    yield f"data: {json.dumps(item)}\n\n"
                    if item.get("done") or item.get("error"):
                        break
                except Empty:
                    yield f"data: {json.dumps({'message': 'Researching...'})}\n\n"

        return Response(generate(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.route("/api/lint")
    def api_lint():
        check_name = request.args.get("check")

        def generate():
            queue = Queue()

            def run():
                try:
                    from ..lint.health import run_lint
                    report = run_lint(config, check_name=check_name)
                    report_html = render_md(report)
                    queue.put({"done": True, "report_html": report_html})
                except Exception as e:
                    queue.put({"error": str(e), "done": True})

            yield f"data: {json.dumps({'message': 'Running health checks...'})}\n\n"
            thread = Thread(target=run, daemon=True)
            thread.start()

            while True:
                try:
                    item = queue.get(timeout=120)
                    yield f"data: {json.dumps(item)}\n\n"
                    if item.get("done") or item.get("error"):
                        break
                except Empty:
                    yield f"data: {json.dumps({'message': 'Still analyzing...'})}\n\n"

        return Response(generate(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.route("/api/render", methods=["POST"])
    def api_render():
        data = request.get_json()
        file_path = data.get("file", "")
        fmt = data.get("format", "slides")

        try:
            if fmt == "slides":
                from ..render.slides import render_slides
                output = render_slides(config, Path(file_path))
                preview_content = read_markdown(output)
                return jsonify({"output": str(output.relative_to(config.vault_path)),
                                "preview": render_md(preview_content)})
            elif fmt == "chart":
                from ..render.charts import render_chart
                output = render_chart(config, Path(file_path))
                return jsonify({"output": str(output.relative_to(config.vault_path))})
        except Exception as e:
            return jsonify({"error": str(e)})

    return app
