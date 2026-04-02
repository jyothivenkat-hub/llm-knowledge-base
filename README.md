# LLM Knowledge Base

> A compiler for knowledge: raw sources in, structured wiki out, LLM as the build system and query engine!

A personal knowledge base system inspired by [Andrej Karpathy's workflow](https://x.com/karpathy/status/1911060539680358665) — raw documents are collected, compiled by an LLM into an interlinked wiki, and operated on via CLI tools for Q&A, search, and visualization. Everything is viewable in [Obsidian](https://obsidian.md/).

## How It Works

```
raw/ (articles, papers, repos)
  │
  ▼  kb ingest
_manifest.yaml (tracks all sources)
  │
  ▼  kb compile
wiki/ (LLM-compiled, interlinked .md files)
  │
  ├── kb qa "question"     → agentic research loop over the wiki
  ├── kb search "query"    → BM25 search (CLI + web UI)
  ├── kb render slides     → Marp slideshows
  ├── kb render chart      → matplotlib visualizations
  └── kb lint              → health checks + consistency analysis
```

The LLM writes and maintains the wiki — you rarely touch it directly. Your explorations and Q&A outputs can be filed back into the wiki, so the knowledge base grows with use.

## Features

- **Data Ingest** — drop articles, papers, or notes into `raw/`, run `kb ingest` to track them. Remote images are downloaded locally. Obsidian Web Clipper works great for capturing web articles.
- **Wiki Compilation** — `kb compile` uses Claude to incrementally build source summaries, extract concepts, categorize into topics, generate cross-links, and build navigable indexes.
- **Q&A** — `kb qa` runs a multi-step research loop: the LLM navigates wiki indexes, reads relevant articles, and synthesizes answers. No RAG needed — index-based navigation scales well.
- **Search** — BM25 search engine with both CLI (`kb search`) and a web UI (`kb search --serve`). Search results link directly into Obsidian.
- **Rendering** — generate Marp slideshows or matplotlib charts from wiki articles.
- **Linting** — LLM-powered health checks: orphan detection, broken links, stale content, missing concepts, and cross-article inconsistency analysis.
- **Obsidian-native** — the project directory is the vault. All links use `[[wikilink]]` syntax. Open in Obsidian and browse.

## Quick Start

### 1. Install

```bash
cd "Karpathy LLM Knowledge base"
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

### 2. Configure

Set your Anthropic API key in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Add sources

Drop markdown files, PDFs, or notes into `raw/articles/`, `raw/papers/`, or `raw/repos/`. If you use the [Obsidian Web Clipper](https://obsidian.md/clipper) browser extension, clips go directly into `raw/articles/`.

### 4. Build the wiki

```bash
kb ingest     # scan raw/ for new files
kb compile    # LLM compiles sources into the wiki
```

### 5. Explore

```bash
kb status                          # vault stats
kb search "attention mechanism"    # search the wiki
kb search --serve                  # web search UI at localhost:8787
kb qa "How does FlashAttention improve transformer training?"
kb qa "Compare scaling laws from Kaplan vs Chinchilla" --save
kb render slides wiki/concepts/attention-mechanism.md
kb lint                            # health checks
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `kb ingest` | Scan `raw/` for new/modified files, update manifest |
| `kb ingest --file PATH` | Ingest a specific file |
| `kb compile` | Incremental wiki compilation |
| `kb compile --full` | Force full recompilation |
| `kb qa "question"` | Ask a question against the wiki |
| `kb qa "question" --save` | Save answer to `output/answers/` |
| `kb search "query"` | CLI search |
| `kb search --serve` | Start web search UI |
| `kb search --rebuild` | Rebuild search index |
| `kb render slides FILE` | Generate Marp slideshow |
| `kb render chart FILE` | Generate matplotlib chart |
| `kb lint` | Run all health checks |
| `kb lint --check NAME` | Run specific check (`orphans`, `broken-links`, `stale`, `missing-concepts`, `inconsistencies`) |
| `kb status` | Show vault statistics |
| `kb file OUTPUT` | Move output back into `raw/` for recompilation |

## Project Structure

```
raw/                    # Source documents (you add these)
wiki/                   # LLM-compiled wiki (auto-generated)
  ├── sources/          # 1:1 summaries of raw files
  ├── concepts/         # Cross-source concept articles
  └── topics/           # Organized by theme
output/                 # Generated artifacts
  ├── answers/          # Q&A results
  ├── slides/           # Marp slideshows
  └── charts/           # Matplotlib images
search_index/           # BM25 index
src/                    # Python source code
templates/prompts/      # Editable LLM prompt templates
config.yaml             # Configuration
```

## Configuration

Edit `config.yaml` to change the model, token limits, or directory layout:

```yaml
model: "claude-sonnet-4-20250514"
max_tokens: 8192
raw_dir: "raw"
wiki_dir: "wiki"
search_web_port: 8787
```

Prompt templates live in `templates/prompts/` as Jinja2 markdown files — edit them to change how the LLM summarizes, categorizes, or answers.

## Design Decisions

- **Incremental compilation** — SHA256 hashes track changes. Only new/modified sources trigger recompilation.
- **Index-based Q&A** (not RAG) — the LLM navigates a hierarchy of index files to find relevant content, keeping token usage efficient even at scale.
- **BM25 search** — simple, fast, no embedding model needed. The LLM compensates for lack of semantic matching by reformulating queries in the Q&A loop.
- **Prompt templates as files** — prompts are versioned `.md` files, not hardcoded strings.

## Requirements

- Python 3.9+
- [Anthropic API key](https://console.anthropic.com/)
- [Obsidian](https://obsidian.md/) (optional, for viewing)

## License

MIT
