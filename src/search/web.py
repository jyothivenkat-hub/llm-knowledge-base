"""Flask web UI for search."""

from __future__ import annotations

from pathlib import Path

from flask import Flask, request, render_template_string, jsonify

from ..config import Config
from .engine import SearchEngine

SEARCH_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Knowledge Base Search</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               max-width: 800px; margin: 40px auto; padding: 0 20px; background: #1a1a2e; color: #e0e0e0; }
        h1 { margin-bottom: 20px; color: #7c83ff; }
        .search-box { display: flex; gap: 8px; margin-bottom: 30px; }
        input[type="text"] { flex: 1; padding: 12px 16px; font-size: 16px; border: 1px solid #333;
                            border-radius: 8px; background: #16213e; color: #e0e0e0; }
        input[type="text"]:focus { outline: none; border-color: #7c83ff; }
        button { padding: 12px 24px; font-size: 16px; background: #7c83ff; color: white;
                border: none; border-radius: 8px; cursor: pointer; }
        button:hover { background: #6a71e0; }
        .result { padding: 16px; margin-bottom: 12px; background: #16213e;
                  border-radius: 8px; border: 1px solid #333; }
        .result:hover { border-color: #7c83ff; }
        .result h3 { margin-bottom: 4px; }
        .result h3 a { color: #7c83ff; text-decoration: none; }
        .result h3 a:hover { text-decoration: underline; }
        .result .path { font-size: 12px; color: #888; margin-bottom: 8px; }
        .result .snippet { font-size: 14px; color: #ccc; }
        .result .score { font-size: 12px; color: #666; float: right; }
        .no-results { color: #888; font-style: italic; }
        .stats { font-size: 12px; color: #666; margin-bottom: 16px; }
    </style>
</head>
<body>
    <h1>Knowledge Base Search</h1>
    <form class="search-box" method="GET" action="/">
        <input type="text" name="q" value="{{ query or '' }}" placeholder="Search the wiki..." autofocus>
        <button type="submit">Search</button>
    </form>
    {% if query %}
    <div class="stats">{{ results|length }} results for "{{ query }}"</div>
    {% endif %}
    {% for r in results %}
    <div class="result">
        <span class="score">{{ "%.2f"|format(r.score) }}</span>
        <h3><a href="obsidian://open?vault={{ vault_name }}&file={{ r.path }}">{{ r.title }}</a></h3>
        <div class="path">{{ r.path }}</div>
        <div class="snippet">{{ r.snippet }}</div>
    </div>
    {% endfor %}
    {% if query and not results %}
    <div class="no-results">No results found for "{{ query }}"</div>
    {% endif %}
</body>
</html>
"""


def create_app(config: Config) -> Flask:
    app = Flask(__name__)
    engine = SearchEngine(config)
    vault_name = config.vault_path.name

    @app.route("/")
    def index():
        query = request.args.get("q", "").strip()
        results = engine.search(query) if query else []
        return render_template_string(
            SEARCH_HTML,
            query=query,
            results=results,
            vault_name=vault_name,
        )

    @app.route("/api/search")
    def api_search():
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"results": []})
        results = engine.search(query)
        return jsonify({"query": query, "results": results})

    return app
