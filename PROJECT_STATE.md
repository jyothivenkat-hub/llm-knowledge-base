# Jyothipedia (IdeaForge) — Project State

Last updated: April 5, 2026

## What This Is

A system that turns research papers into a wiki, knowledge graph, and product ideas. Based on Andrej Karpathy's LLM Knowledge Base concept, extended with a knowledge graph, interactive visualization, smart search with LLM synthesis, and product idea generation.

**Live demo:** https://llm-knowledge-base-nine.vercel.app
**GitHub:** https://github.com/jyothivenkat-hub/llm-knowledge-base

---

## Architecture

```
User uploads papers (PDFs, markdown, text)
  ↓
Flask Backend (Python, port 8888)
  ├── Ingest: track files in raw/_manifest.yaml
  ├── Compile: 7-stage LLM pipeline
  │   1. Extract text from PDFs/md
  │   2. Chunk into 8-15 key insights per paper
  │   3. Find cross-paper connections (supports/contradicts/extends)
  │   4. Cluster into research themes
  │   5. Generate evolving entity pages
  │   6. Enrich (contradictions, gaps, synthesis)
  │   7. Generate product ideas
  ├── Search: BM25 + graph nodes + LLM synthesis
  ├── Wiki: compiled source articles in markdown
  └── All data stored as JSON + markdown files (no database)
  ↓
React Frontend (TypeScript/Vite, port 3000)
  ├── Main Page: Wikipedia-style with featured research, articles, clusters
  ├── Knowledge Graph: D3.js force-directed visualization
  ├── Search: Smart search with synthesized answers + evidence trail
  ├── Research Ideas: Product ideas with evidence
  └── Sources: Upload, manage, compile
```

## Two Frontends

| | Flask (port 8888) | React (port 3000) |
|---|---|---|
| **URL** | http://localhost:8888 | http://localhost:3000 |
| **Tech** | Flask + Jinja2 templates | React + TypeScript + Vite + Tailwind |
| **Wiki** | Full Wikipedia-style at /wiki/ | WikiView component fetches /api/wiki-articles |
| **Status** | Complete, all features work | Primary frontend going forward |
| **Vercel** | Serves the API | Serves the UI |

**The React frontend at :3000 is the main UI.** Flask at :8888 is the API engine.

## Key Files

### Backend (Flask + Python)
```
src/
  config.py          — Config loader, reads config.yaml + .env
  llm.py             — Claude API wrapper with Jinja2 templates
  utils.py           — Helpers: sha256, slugify, parse_llm_json
  cli.py             — Click CLI (kb command)
  _search_rebuild.py — Helper for search index rebuild

  compiler/
    compiler.py      — Main orchestrator: extract → graph_builder → indexes
    graph_builder.py — 7-stage incremental pipeline (chunk/connect/cluster/entity/enrich/ideas/save)
    summarizer.py    — Source summarization (writes wiki/sources/*.md)
    categorizer.py   — Legacy concept extraction
    linker.py        — Backlinks builder
    indexer.py       — Index file generator

  dashboard/
    app.py           — Flask app with ALL API routes
    templates/       — Flask HTML templates (wiki_base.html, wiki.html, etc.)
    static/          — CSS, JS for Flask frontend

  search/
    engine.py        — BM25 search over wiki + graph nodes

  qa/
    qa.py            — Agentic Q&A research loop

  ingest/
    ingest.py        — File scanner, image downloader
    manifest.py      — Manifest manager (SHA256 tracking)

  render/
    slides.py        — Marp slideshow generator
    charts.py        — Matplotlib chart generator

  lint/
    health.py        — Health checks (orphans, broken links, stale, contradictions)
```

### Frontend (React)
```
frontend/
  src/
    App.tsx            — Main app, tabs, sidebar, compile handler
    types.ts           — TypeScript types (AppState, ResearchSource, etc.)
    mockData.ts        — Empty initial state (real data loads from API)
    main.tsx           — React entry point
    index.css          — Tailwind + Wikipedia-style CSS

    services/
      api.ts           — ALL API calls (loadState, runCompile, askQuestion, etc.)

    components/
      WikiView.tsx     — Wiki browser: article list → click → read full article
      GraphView.tsx    — D3.js force-directed graph with cluster colors
      ChatView.tsx     — Smart search with evidence trail + file-back
      IdeasView.tsx    — Product ideas with tagline, evidence, difficulty
      ResearchView.tsx — Upload, add, ingest, compile with streaming progress

    lib/
      utils.ts         — cn() helper for Tailwind

  vite.config.ts       — Vite config with proxy to Flask :8888
  package.json         — Dependencies
  tsconfig.json        — TypeScript config
```

### Data
```
raw/                   — Source documents (immutable)
  articles/            — Markdown articles (4 files)
  papers/              — PDFs (6 files)
  images/              — Downloaded images
  _manifest.yaml       — Tracks all sources with SHA256 hashes

wiki/                  — LLM-compiled output
  sources/             — 10 compiled source summary articles (.md)
  claims/              — 90 atomic claim pages (.md)
  entities/            — 24 evolving entity pages (.md)
  graph.json           — Knowledge graph (90 nodes, 129 edges, 8 clusters, 8 ideas)
  graph_insights.json  — Contradictions, gaps, synthesis opportunities
  _index.md            — Master index
  _summary.md          — Wiki summary
  _backlinks.yaml      — Reverse link index
  _compilation_state.yaml — Incremental compile state
  log.md               — Chronological compile log

config.yaml            — Model config (currently claude-haiku-4-5-20251001)
.env                   — API key (gitignored, set to placeholder)
CLAUDE.md              — Wiki schema document
```

### Prompt Templates
```
templates/prompts/
  chunk_claims.md          — Extract key insights (quality > quantity)
  connect_claims.md        — Find cross-paper relationships
  cluster_claims.md        — Group into themes
  enrich_graph.md          — Find contradictions, gaps, synthesis
  generate_product_ideas.md — Generate product ideas from research
  generate_entity.md       — Create/update evolving entity pages
  summarize_source.md      — Summarize raw source into wiki article
  synthesize_search.md     — Synthesize answer from claims + graph
  qa_research.md           — Agentic Q&A loop
  qa_graph_research.md     — Graph-traversal Q&A
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mode` | GET | Returns demo/full mode + model name |
| `/api/graph` | GET | Full graph.json (nodes, edges, clusters, ideas) |
| `/api/graph/insights` | GET | Contradictions, gaps, synthesis |
| `/api/graph/node/<id>` | GET | Single node + 1-hop neighbors |
| `/api/graph/search?q=` | GET | Search graph nodes |
| `/api/sources` | GET/POST | List sources or create new one |
| `/api/wiki-page` | GET | Rich compiled landing page data (clusters, findings, methods) |
| `/api/wiki-articles` | GET | All compiled source articles with HTML content |
| `/api/search?q=` | GET | BM25 search |
| `/api/cached-search?q=` | GET | Pre-computed answers for demo |
| `/api/smart-search?q=` | GET (SSE) | Live BM25 + LLM synthesis |
| `/api/compile/stream` | GET (SSE) | Streaming compile progress |
| `/api/ingest` | POST | Scan raw/ for new files |
| `/api/upload` | POST | Upload files to raw/articles/ |
| `/api/file-back` | POST | Save answer back to raw/ for recompilation |
| `/api/wiki/save` | POST | Save edited wiki page |
| `/api/wiki/raw?path=` | GET | Get raw markdown for editing |
| `/api/clip` | POST | Web clipper: receive clipped content |
| `/api/lint` | GET (SSE) | Health checks |
| `/api/render` | POST | Generate slides/charts |
| `/raw/<path>` | GET | Serve raw source files (PDFs, markdown) |
| `/wiki/<path>` | GET | Flask wiki article pages |

## Current Data (after latest compile)

- **10 research papers** ingested (4 markdown, 6 PDFs)
- **90 atomic claims** extracted (quality insights, not restated sentences)
- **129 typed connections** (supports, contradicts, extends, etc.)
- **8 research clusters** (themes)
- **24 entity pages** (evolving concept pages)
- **8 product ideas** (grounded in research)
- **10 source summary articles** (compiled by LLM)

## What Works

- **Main Page**: Shows featured research cluster, all articles, research areas, product ideas
- **Wiki Articles**: Click any article → read full compiled content with wikilinks
- **Knowledge Graph**: D3.js with cluster colors, hover highlights, click detail
- **Search**: BM25 finds claims, LLM synthesizes answers, shows evidence trail
- **Product Ideas**: Cards with tagline, problem, solution, audience, evidence
- **Sources**: Upload files, add manually, compile with streaming progress
- **Compile**: Incremental (only processes new papers), auto-rebuilds search index
- **File-back**: Answers can be filed back to raw/ for recompilation
- **Demo mode**: Vercel serves read-only with pre-compiled data

## What Needs Work

- **Vercel deployment**: React frontend loads, API works, but wiki article links through Flask proxy may not fully work on Vercel
- **Entity pages**: Generated but not shown in React frontend yet
- **Web clipper**: Backend endpoint exists, not exposed in React UI
- **Render (slides/charts)**: Backend works, not in React UI
- **Wiki editor**: Backend API exists, not in React UI
- **Log viewer**: wiki/log.md exists, not shown in UI
- **Cached search answers**: Need regeneration with new quality data

## How to Run Locally

```bash
# Terminal 1: Flask backend
cd "Karpathy LLM Knowledge base"
source .venv/bin/activate
# Set your API key in .env first
kb dashboard --port 8888

# Terminal 2: React frontend
cd "Karpathy LLM Knowledge base/frontend"
npm run dev
# Opens at http://localhost:3000
```

## How to Add Research and Compile

1. Drop PDFs/markdown into `raw/articles/` or `raw/papers/`
2. Open http://localhost:3000 → Sources tab
3. Click "Scan raw/" to ingest new files
4. Click "Compile" → watch streaming progress
5. Main page auto-refreshes with new content

## Key Decisions Made

1. **Quality over quantity in chunking**: Prompt asks for 8-15 key insights per paper, not every sentence restated. "If you wouldn't tweet it, don't include it."

2. **Incremental compile**: Only processes new/modified papers. Preserves existing claims and edges. SHA256 hash tracking.

3. **Search filters metadata**: BM25 results filter out _index.md, log.md, and metadata files. Graph nodes are boosted to top.

4. **React frontend is primary UI**: Flask serves as API engine. React at port 3000 is the user-facing app.

5. **Slim Vercel deployment**: requirements.txt excludes pymupdf and matplotlib to fit Lambda 245MB limit. Full deps in requirements-local.txt.

6. **Wiki articles are the product**: Not dashboards with statistics. Real compiled articles you read, with wikilinks between them.

## For Codex/Cursor Continuation

The React frontend at `frontend/` is the focus. Key things to improve:

1. **WikiView**: Currently fetches from `/api/wiki-articles` and `/api/wiki-page`. The articles are real compiled content. Make the main page more Wikipedia-like with better layout.

2. **Entity pages**: 24 entity pages exist in `wiki/entities/` but aren't shown in React. Add an endpoint and UI for them.

3. **Inter-article navigation**: Wikilinks work within React but link resolution is basic. Could be improved.

4. **Search quality**: The LLM synthesizes well when it gets good claims. The BM25 → filter → LLM pipeline in `/api/smart-search` works but could use caching.

5. **Graph**: D3.js works but could be more interactive (click cluster to filter, better layout).

6. **Mobile**: Not optimized for mobile at all.

The Flask backend at `src/dashboard/app.py` has ALL the API endpoints. The React service layer at `frontend/src/services/api.ts` has ALL the API calls. Types are in `frontend/src/types.ts`.
