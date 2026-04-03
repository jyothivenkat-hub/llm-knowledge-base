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

        # Library landing page (wiki root)
        if not path or path == "":
            papers = []
            graph_nodes = []
            if config.graph_path.exists():
                graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
                graph_nodes = graph.get("nodes", [])

            # Build paper list from manifest
            from ..ingest.manifest import Manifest
            manifest = Manifest(config.raw_path / "_manifest.yaml")
            for entry in manifest.all_entries():
                claim_count = sum(1 for n in graph_nodes if entry.path in n.get("source_paper", ""))
                source_type = "PDF" if entry.path.endswith(".pdf") else "Article"
                # Find the wiki source summary if it exists
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

            return render_template("wiki.html", active="wiki", is_dir=True,
                                   is_library_root=True, papers=papers,
                                   claims_summary=claims_summary)

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
                                   items=items, breadcrumb=breadcrumb)

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
            if config.graph_path.exists():
                graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
                # Match claims by source paper or by filename
                for n in graph.get("nodes", []):
                    sp = n.get("source_paper", "")
                    if target.stem.lower() in sp.lower() or sp.lower() in str(target).lower():
                        article_claims.append(n)

            # Load backlinks
            backlinks = []
            bl_path = wiki_path / "_backlinks.yaml"
            if bl_path.exists():
                bl_data = yaml.safe_load(bl_path.read_text(encoding="utf-8")) or {}
                backlinks = bl_data.get(target.stem.lower(), [])

            return render_template("wiki.html", active="wiki", is_dir=False,
                                   is_article=True, article_title=article_title,
                                   article_source=article_source,
                                   article_claims=article_claims,
                                   content=html, breadcrumb=breadcrumb,
                                   backlinks=backlinks)

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

                    if not results:
                        queue.put({"done": True, "answer_html": "<p>No matching claims found. Try different keywords.</p>", "evidence": []})
                        return

                    # Step 2: Load graph for connections
                    graph_nodes = {}
                    graph_edges = []
                    insights_list = []

                    if config.graph_path.exists():
                        graph = json.loads(config.graph_path.read_text(encoding="utf-8"))
                        graph_nodes = {n["id"]: n for n in graph.get("nodes", [])}
                        graph_edges = graph.get("edges", [])

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
