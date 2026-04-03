# Development Log: LLM Knowledge Base

A complete record of every step taken to build this project, from empty directory to working knowledge graph system.

## The Idea

Inspired by [Andrej Karpathy's post](https://x.com/karpathy/status/1911060539680358665) about using LLMs to build personal knowledge bases. The concept: collect raw research documents, have an LLM "compile" them into an interlinked wiki, then query and explore the compiled knowledge.

We took it further — instead of just summarizing papers into flat wiki articles, we built a **knowledge graph** that chunks papers into atomic claims, discovers cross-paper connections, and lets you visually explore how ideas relate.

---

## Phase 1: Foundation

**What we built:** Project skeleton, config system, LLM wrapper, CLI framework.

**Files created:**
- `pyproject.toml` — Python package with `kb` console script
- `config.yaml` — Model, paths, ports configuration
- `.env` — Anthropic API key (gitignored)
- `src/config.py` — Loads YAML config + .env, provides path properties
- `src/llm.py` — Claude API wrapper with Jinja2 prompt templates, retry logic, token tracking
- `src/utils.py` — Helpers: SHA256 hashing, slugify, wikilink extraction, markdown reading, JSON parsing
- `src/cli.py` — Click CLI with subcommands

**Key decisions:**
- Python 3.9 compatibility (the system Python on macOS)
- Claude API via `anthropic` SDK
- Prompt templates as editable `.md` files in `templates/prompts/`
- The project directory IS the Obsidian vault

**Test:** `kb status` shows vault stats, API key status.

---

## Phase 2: Ingest Pipeline

**What we built:** File scanning, manifest tracking, image downloading.

**Files created:**
- `src/ingest/ingest.py` — Scans `raw/` for new/modified files, extracts titles from front matter
- `src/ingest/manifest.py` — `Manifest` class tracking all sources with SHA256 hashes for change detection
- `src/ingest/images.py` — Downloads remote images from markdown files to local

**How it works:**
1. User drops files into `raw/articles/` or `raw/papers/`
2. `kb ingest` scans for new/modified files
3. Computes SHA256 hash of each file
4. Extracts title (from YAML front matter, first heading, or filename)
5. Updates `raw/_manifest.yaml` with tracking info
6. Downloads remote images to `raw/images/`

**Supported formats:** `.md`, `.txt`, `.pdf`

**Test:** Drop a markdown file in `raw/articles/`, run `kb ingest`, verify manifest entry created.

---

## Phase 3: Original Wiki Compiler (Later Replaced)

**What we built first (v1):** A summarization-based compiler.

**Original pipeline:**
1. Summarize each source → `wiki/sources/*.md`
2. Extract concepts from summaries → categorize into topics
3. Generate concept articles → `wiki/concepts/*.md`
4. Build backlinks → `wiki/_backlinks.yaml`
5. Generate index files → `wiki/*/_index.md`
6. Generate wiki summary → `wiki/_summary.md`

**Why we replaced it:** This was too shallow. It produced one summary per paper in flat folders. No connections between papers, no chunking, no graph. Just a fancy summarizer.

---

## Phase 4: Search Engine

**What we built:** BM25 full-text search.

**Files created:**
- `src/search/engine.py` — `SearchEngine` class using `rank_bm25` library
- `src/search/web.py` — Flask web UI for search (later merged into dashboard)

**How it works:**
- Indexes all `.md` files in `wiki/` + graph nodes from `graph.json`
- Tokenizes text, removes stopwords
- BM25 ranking on query
- Returns top-K results with path, title, snippet, score

**Evolution:** Started as dumb keyword search. Later upgraded to also index graph nodes and feed results to LLM for synthesis.

---

## Phase 5: Q&A System (Later Merged into Search)

**What we built:** An agentic research loop.

**Files created:**
- `src/qa/qa.py` — Multi-step LLM research loop

**How it worked:**
1. Load wiki summary + index files as initial context
2. LLM decides: read specific files, search, or answer
3. Loop up to 5 iterations, gathering context
4. Synthesize final answer

**Why we merged it:** When Search got smart synthesis (BM25 → gather graph context → LLM answer), Q&A became redundant. Now Search does both: returns a ranked list AND a synthesized answer — like Google's AI summaries.

---

## Phase 6: Render & Lint

**What we built:** Output generation and health checks.

**Files created:**
- `src/render/slides.py` — Converts wiki articles to Marp slideshow format
- `src/render/charts.py` — LLM extracts data from articles, generates matplotlib charts
- `src/lint/health.py` — Health checks: orphan articles, broken wikilinks, stale content, missing concepts, cross-article inconsistencies

**Lint checks:**
- `orphans` — Articles with zero incoming links
- `broken-links` — `[[wikilinks]]` pointing to nonexistent files
- `stale` — Sources modified since last compilation
- `missing-concepts` — LLM suggests concepts that should exist
- `inconsistencies` — LLM finds contradictions between related articles

---

## Phase 7: Web Dashboard

**What we built:** Flask web dashboard replacing the CLI for all operations.

**Files created:**
- `src/dashboard/app.py` — Flask app with all routes + SSE streaming endpoints
- `src/dashboard/templates/` — 9 HTML templates (base, dashboard, ingest, compile, qa, search, wiki, render, lint)
- `src/dashboard/static/style.css` — Dark theme CSS
- `src/dashboard/static/app.js` — Frontend JS (SSE handlers, file upload, live search)

**Key features:**
- Server-Sent Events (SSE) for streaming progress on compile and Q&A
- Drag & drop file upload
- Live search with debouncing
- Markdown rendering with wikilink conversion to HTML links
- Dark theme matching existing search UI

**SSE streaming design:** Long-running operations (compile, Q&A, lint) run in a background thread. Progress messages are pushed to a Queue, which the SSE generator yields from. Frontend uses `EventSource` to consume the stream.

**CLI addition:** `kb dashboard --port 8888` launches the web app.

---

## Phase 8: Knowledge Graph Redesign

**The pivot:** User pointed out the system was too shallow. "It just synthesizes and creates wiki articles. I was thinking it would break down into chunks, find connections, map them, and add meaning."

**What Obsidian does:** Chunks and links, but it's dumb — text matching only.
**What we added:** LLM-powered meaning — understanding relationships, finding contradictions, identifying gaps.

### New Pipeline (replaced Phase 3)

**File created:** `src/compiler/graph_builder.py` — The core 5-stage pipeline.
**File rewritten:** `src/compiler/compiler.py` — Simplified orchestrator.

**Stage 1: Extract** — Read raw text from PDFs (via pymupdf) and markdown files directly. No summarization step — work with the original content.

**Stage 2: Chunk** — LLM breaks each paper into 5-30 atomic claims. Each claim gets: text, type (finding/claim/method/concept/hypothesis), tags for cross-referencing, evidence note. Each claim saved as its own wiki page in `wiki/claims/*.md`.

**Stage 3: Connect** — LLM finds relationships between claims across papers. Uses tag-overlap batching to avoid O(N^2) comparisons — only compare claims that share tags, batch 18 claims per LLM call. Relationship types: supports, contradicts, extends, causes, is-part-of, related-to, provides-mechanism-for, uses-method.

**Stage 4: Cluster** — LLM groups all claims into 3-15 thematic clusters. Each cluster gets a label, description, color, and list of member claims.

**Stage 5: Enrich** — LLM analyzes the full graph structure to find:
- Contradictions between claims
- Knowledge gaps (what no paper addresses)
- Synthesis opportunities (claims that combine into new insights)
- Bridge claims (connecting separate clusters)
- Key open research questions

**Output:** `wiki/graph.json` (nodes + edges + clusters + metadata) and `wiki/graph_insights.json` (contradictions, gaps, synthesis).

### New Prompt Templates

- `templates/prompts/chunk_claims.md` — Extract atomic claims from paper text
- `templates/prompts/connect_claims.md` — Find relationships between claim batches
- `templates/prompts/cluster_claims.md` — Group claims into themes
- `templates/prompts/enrich_graph.md` — Find contradictions, gaps, synthesis
- `templates/prompts/synthesize_search.md` — Synthesize answer from claims + graph context
- `templates/prompts/qa_graph_research.md` — Graph-traversal Q&A prompt

### Cost Analysis

For 6 papers (~150 claims):
- Chunk: 10 LLM calls
- Connect: 5-8 calls
- Cluster: 1 call
- Enrich: 1 call
- Total: ~15 calls

---

## Phase 9: Interactive Graph Visualization

**Files created:**
- `src/dashboard/templates/graph.html` — D3.js graph page
- `src/dashboard/static/graph.js` — Force-directed graph implementation

**Features:**
- D3.js v7 force-directed layout (loaded via CDN, no build tools)
- Nodes sized by connection count, colored by cluster/paper/type
- Edges styled by relationship type (solid=supports, dashed=contradicts, dotted=related)
- Cluster convex hulls as subtle background shapes
- Click node → detail panel with claim text, source, all connections
- Hover → highlight 1-hop neighbors, fade everything else
- Search → highlights matching nodes
- Filter by cluster (click in sidebar)
- Filter by edge type (checkboxes)
- Insights panel at bottom showing contradictions, gaps, synthesis
- Color-by toggle (cluster / paper / type)

**API endpoints added:**
- `GET /api/graph` — Full graph JSON
- `GET /api/graph/insights` — Insights JSON
- `GET /api/graph/node/<id>` — Single node + 1-hop subgraph
- `GET /api/graph/search?q=` — Search graph nodes

---

## Phase 10: Smart Search

**The merge:** User said "search needs to synthesize and answer the question asked." Combined BM25 search with LLM synthesis.

**How smart search works:**
1. BM25 search across wiki claims + graph nodes (315 indexed documents)
2. For matching claims, load their graph connections (supporting/contradicting claims)
3. Load known insights (contradictions, synthesis opportunities)
4. Send everything to Claude to synthesize a comprehensive answer
5. Return: synthesized answer at top + evidence trail (ranked claims) below

**Cached answers for free demo:**
- Pre-computed Opus answers for 10 common research questions
- Stored in `src/dashboard/static/cached_answers.json`
- Search tries cache first (instant, zero cost), falls back to live API
- Fuzzy matching on keywords for cache hits
- Suggested questions shown as clickable buttons

---

## Phase 11: Dashboard Polish

### Sidebar cleanup

Removed Q&A (redundant with smart search). Renamed labels:

```
Home        ← Dashboard
Sources     ← Ingest
Compile
Graph
Wiki        ← Library/Wiki — paper index with claim counts
Search      ← Smart search with synthesis
─────────
Render      ← Tools section
Health      ← Lint
```

### Dashboard home page

Added horizontal pipeline flow: `① Upload → ② Compile → ③ Explore → ④ Search`

Each step shows status badges (green when done, purple when next). Stats cards below with sources, claims, connections, clusters.

### Wiki page rebuilt

Was a raw file browser. Now a proper paper index:
- Table of all papers with title, claim count, source type
- Click paper → see full content + all extracted claims
- Stats cards: total papers, claims, findings, methods
- Links to browse all claims or source summaries

---

## Phase 12: Deployment

### GitHub

- Repository: `github.com/jyothivenkat-hub/llm-knowledge-base`
- Fixed git author from `gprash77` to `Jyothi Venkat` across all 9 repos
- Deleted empty `Projects` repo

### Vercel

- Deployed at: `llm-knowledge-base-nine.vercel.app`
- `vercel.json` routes all requests to Flask via `api/index.py`
- Static files served directly
- Auto-deploys on push to main
- Free demo: graph browsing + cached answers (zero API cost)
- Full functionality: run locally with API key (`kb dashboard`)

---

## Architecture Summary

```
raw/ (PDFs, markdown, text)
  │
  ▼ kb ingest
_manifest.yaml (SHA256 tracking)
  │
  ▼ kb compile
  ├── Extract text from PDFs/md
  ├── Chunk into atomic claims → wiki/claims/*.md
  ├── Find cross-paper connections
  ├── Cluster into themes
  └── Enrich (contradictions, gaps, synthesis)
  │
  ▼ Output
  ├── wiki/graph.json (nodes + edges + clusters)
  ├── wiki/graph_insights.json (contradictions, gaps, synthesis)
  └── wiki/claims/*.md (one page per claim)
  │
  ▼ Explore
  ├── /graph — Interactive D3.js visualization
  ├── /wiki — Paper index with claim counts
  ├── /search — Smart search (BM25 + LLM synthesis)
  └── /render, /health — Tools
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.9 |
| LLM | Claude Opus 4 (configurable) |
| API | Anthropic SDK |
| Web framework | Flask |
| Graph visualization | D3.js v7 |
| Search | BM25 (rank_bm25) |
| PDF extraction | PyMuPDF |
| Templating | Jinja2 |
| Markdown | python-markdown |
| Styling | Custom CSS (dark theme) |
| CLI | Click + Rich |
| Deployment | Vercel (serverless) |
| Repository | GitHub |

## File Count

- 40+ Python source files
- 9 HTML templates
- 2 JS files (app.js + graph.js)
- 1 CSS file
- 7 prompt templates
- 150 wiki claim pages (generated)
- 1 graph JSON (generated)
