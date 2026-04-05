# IdeaForge

Turn research papers into a living Wikipedia, knowledge graph, and product ideas.

Upload PDFs and articles. AI extracts key insights, finds cross-paper connections, builds a wiki with interlinked entity pages, visualizes everything as an interactive knowledge graph, answers questions with evidence trails, and generates product ideas grounded in your research.

**Live demo:** [llm-knowledge-base-nine.vercel.app](https://llm-knowledge-base-nine.vercel.app)

Inspired by [Andrej Karpathy's LLM Knowledge Base](https://x.com/karpathy) concept.

## What It Does

Drop in research papers. Hit compile. Get:

- **Wikipedia-style wiki** with domain portals, entity pages, and source summaries
- **Interactive knowledge graph** (D3.js) with domain and cluster filters
- **Evidence-backed search** with LLM synthesis and auto-caching
- **Product ideas** generated from research findings, gaps, and synthesis
- **"Did You Know" facts** surfacing surprising cross-domain connections

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
git clone https://github.com/jyothivenkat-hub/llm-knowledge-base.git
cd llm-knowledge-base

# Python backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-local.txt

# Set your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# React frontend
cd frontend
npm install
cd ..
```

### Run

```bash
# Terminal 1: Flask backend
source .venv/bin/activate
kb dashboard --port 8888

# Terminal 2: React frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Add Research and Compile

1. Drop PDFs into `raw/papers/` or markdown into `raw/articles/`
2. Go to **Sources** tab
3. Click **Scan raw/** to register new files
4. Click **Compile** and watch the pipeline run
5. Main page shows domains, articles, and "Did You Know" facts

## The 8-Stage Compile Pipeline

| Stage | What it does |
|-------|-------------|
| 1. Extract | Read text from PDFs and markdown |
| 2. Chunk | Break each paper into 5-30 atomic claims |
| 3. Connect | Find cross-paper relationships (supports, contradicts, extends) |
| 4. Cluster | Group claims into 5-10 research themes |
| 5. Domains | Group clusters into 3-6 portals with "Did You Know" facts |
| 6. Entities | Create/update evolving concept pages |
| 7. Enrich | Find contradictions, gaps, synthesis opportunities |
| 8. Ideas | Generate product concepts grounded in the research |

Only new/modified papers get processed. Existing claims are preserved.

## Architecture

```
raw/                    Immutable source documents (your papers)
wiki/                   LLM-generated knowledge base
  claims/               Atomic claims, one per file
  entities/             Evolving concept pages
  sources/              Per-paper summary articles
  graph.json            Knowledge graph (nodes, edges, clusters, domains)
src/
  compiler/             8-stage LLM pipeline
  dashboard/            Flask API (all endpoints)
  search/               BM25 search engine
frontend/               React + TypeScript + Vite + Tailwind + D3.js
templates/prompts/      LLM prompt templates (editable)
```

## Features

**Main Page** -- 3-level Wikipedia-style navigation. Domain cards on top, click into a domain portal with filtered clusters/entities/articles, then into individual articles with breadcrumb nav.

**Knowledge Graph** -- D3.js force-directed visualization. Domain dropdown filter and clickable cluster themes on the left. Hover for neighbors, click for detail panel.

**Search** -- BM25 + graph context + LLM synthesis. Auto-caches answers. Evidence trail with claim types and source papers. File answers back for recompilation.

**Wiki Editor** -- Edit button on every article and entity page. Markdown editing with live preview.

**Web Clipper** -- Paste article content from the sidebar. Saves to raw/ for next compile.

**Sources** -- Grouped by domain. Upload files, scan, compile from the UI.

**Product Ideas** -- 5-10 ideas generated from research findings, gaps, and synthesis. Each has problem, solution, audience, difficulty, and backing evidence.

## Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/wiki-page` | Main page data (domains, clusters, stats) |
| `GET /api/wiki-articles` | All compiled source articles |
| `GET /api/entities` | All entity pages |
| `GET /api/entity/<slug>` | Single entity with HTML content |
| `GET /api/domain/<id>` | Domain portal data |
| `GET /api/graph` | Full knowledge graph |
| `GET /api/smart-search?q=` | LLM-synthesized search (SSE) |
| `GET /api/compile/stream` | Streaming compile progress (SSE) |
| `POST /api/clip` | Web clipper |
| `POST /api/wiki/save` | Save edited wiki page |

## Deploying to Vercel

Deploys as a read-only demo (compiled data, no live LLM calls).

```bash
npm i -g vercel
vercel --prod
```

Uses `requirements-vercel.txt` (excludes pymupdf/matplotlib for Lambda size limits).

## CLI Reference

| Command | Description |
|---------|-------------|
| `kb ingest` | Scan raw/ for new files |
| `kb compile` | Incremental compile |
| `kb compile --full` | Full recompile |
| `kb dashboard --port 8888` | Start Flask API server |
| `kb search "query"` | CLI search |
| `kb qa "question"` | Ask a question |
| `kb lint` | Health checks |
| `kb status` | Vault stats |

## Configuration

**config.yaml:**
```yaml
model: claude-haiku-4-5-20251001
max_tokens: 8192
```

**.env:**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Prompt templates in `templates/prompts/` are editable Jinja2 markdown files.

## What Makes It Different From RAG

RAG re-discovers knowledge from scratch on every question. IdeaForge **compiles once, compounds forever**. Cross-references are pre-built, contradictions pre-flagged, synthesis already done. Every new paper and every question makes the wiki richer.

## License

MIT
