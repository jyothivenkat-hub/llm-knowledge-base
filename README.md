# IdeaForge

> Turn research papers into a living knowledge system.

Upload PDFs and articles. AI extracts atomic claims, finds cross-paper relationships, clusters insights into research themes, builds Wikipedia-style entity pages, visualizes everything as an interactive knowledge graph, and generates product ideas grounded in your research.

**Live demo:** [llm-knowledge-base-nine.vercel.app](https://llm-knowledge-base-nine.vercel.app)

Inspired by [Andrej Karpathy's LLM Knowledge Base](https://x.com/karpathy) concept.

---

## Architecture

```
                      +-------------------------------------------+
                      |               IdeaForge                   |
                      +-------------------------------------------+
                                         |
             +---------------------------+---------------------------+
             |                           |                           |
    +--------v--------+       +---------v---------+       +---------v---------+
    |   React Frontend |       |    Flask API       |       |   CLI Interface    |
    |  (TypeScript/Vite)|       |   (Dashboard)      |       |   (kb commands)    |
    +------------------+       +-------------------+       +-------------------+
             |                           |                           |
             +---------------------------+---------------------------+
             |                           |                           |
    +--------v--------+       +---------v---------+       +---------v---------+
    | Knowledge Graph  |       |  8-Stage Compiler  |       |   Search Engine    |
    |   (D3.js)        |       |  (Claude API)      |       |  (BM25 + LLM)     |
    +------------------+       +-------------------+       +-------------------+
             |                           |                           |
             +---------------------------+---------------------------+
                                         |
                              +---------v---------+
                              |   wiki/ Knowledge  |
                              |   Base (Markdown)  |
                              +-------------------+

    +------------------+
    | Research Papers   |       Drop files into raw/
    +------------------+
    | PDFs             |  -->  +-----------+
    | Markdown articles|  -->  | IdeaForge |  -->  Wiki + Graph + Ideas
    | Web clippings    |  -->  | compiles  |
    +------------------+       +-----------+
```

### Data Flow

```
 1. INGEST         2. COMPILE            3. CONNECT           4. OUTPUT
 +-----------+    +---------------+     +---------------+    +----------------+
 | PDFs &    | -> | Extract text, | ->  | Find cross-   | -> | Wiki pages     |
 | articles  |    | break into    |     | paper links,  |    | Knowledge graph|
 | into raw/ |    | atomic claims |     | cluster into  |    | Entity pages   |
 +-----------+    +---------------+     | themes        |    | Product ideas  |
                                        +---------------+    +----------------+
```

---

## What It Does

### Upload and Compile
Drop research papers (PDF or markdown) into the `raw/` directory or use the web clipper. IdeaForge runs an 8-stage LLM pipeline that:
- **Extracts** text from PDFs and markdown files
- **Chunks** each paper into 5-30 atomic claims
- **Connects** claims across papers (supports, contradicts, extends)
- **Clusters** claims into 5-10 research themes
- **Detects domains** and groups clusters into 3-6 portals with "Did You Know" facts
- **Creates entity pages** -- evolving concept pages that grow with each paper
- **Enriches** the graph with contradictions, gaps, and synthesis opportunities
- **Generates product ideas** grounded in the research findings

Only new or modified papers get processed. Existing claims are preserved.

### Browse the Wiki
A 3-level Wikipedia-style navigation. Domain cards on top, click into a domain portal with filtered clusters, entities, and articles, then into individual articles with breadcrumb navigation. Every article and entity page has an inline markdown editor.

### Explore the Knowledge Graph
Interactive D3.js force-directed visualization. Domain dropdown filter and clickable cluster themes on the left. Hover to highlight neighbors, click for a detail panel with source papers and related claims.

### Search with Evidence
BM25 keyword search combined with graph context and LLM synthesis. Every answer includes an evidence trail with claim types and source papers. Answers are auto-cached and filed back into the wiki for recompilation.

### Generate Product Ideas
5-10 product concepts generated from research findings, gaps, and cross-paper synthesis. Each idea includes the problem, proposed solution, target audience, difficulty rating, and backing evidence.

---

## The 8-Stage Compile Pipeline

| Stage | What It Does |
|-------|-------------|
| 1. Extract | Read text from PDFs and markdown |
| 2. Chunk | Break each paper into 5-30 atomic claims |
| 3. Connect | Find cross-paper relationships (supports, contradicts, extends) |
| 4. Cluster | Group claims into 5-10 research themes |
| 5. Domains | Group clusters into 3-6 portals with "Did You Know" facts |
| 6. Entities | Create or update evolving concept pages |
| 7. Enrich | Find contradictions, gaps, synthesis opportunities |
| 8. Ideas | Generate product concepts grounded in the research |

---

## Download & Install

### Prerequisites
- [Python](https://www.python.org/) 3.10 or later
- [Node.js](https://nodejs.org/) 18 or later
- An [Anthropic API key](https://console.anthropic.com/)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/jyothivenkat-hub/llm-knowledge-base.git

# 2. Navigate to the project
cd llm-knowledge-base

# 3. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 4. Install Python dependencies
pip install -r requirements-local.txt

# 5. Set your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# 6. Install frontend dependencies
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

Open [http://localhost:3000](http://localhost:3000).

### Add Research and Compile

1. Drop PDFs into `raw/papers/` or markdown into `raw/articles/`
2. Go to the **Sources** tab in the UI
3. Click **Scan raw/** to register new files
4. Click **Compile** and watch the pipeline run
5. The main page shows domains, articles, and "Did You Know" facts

### Configuration

**config.yaml:**
```yaml
model: claude-haiku-4-5-20251001
max_tokens: 8192
```

**.env:**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Prompt templates in `templates/prompts/` are editable Jinja2 markdown files. Modify them to change how the LLM extracts claims, builds entities, or generates ideas.

### Deploying to Vercel

Deploys as a read-only demo (pre-compiled data, no live LLM calls).

```bash
npm i -g vercel
vercel --prod
```

Uses `requirements-vercel.txt` (excludes pymupdf/matplotlib for Lambda size limits).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.10+, TypeScript |
| Backend | Flask |
| AI | Anthropic Claude API (Haiku) |
| Frontend | React 19, Vite |
| Styling | Tailwind CSS |
| Graph | D3.js (force-directed) |
| Search | BM25 + LLM synthesis |
| Prompts | Jinja2 templates |

---

## Project Structure

```
llm-knowledge-base/
  src/
    compiler/
      compiler.py            -- Orchestrates the 8-stage pipeline
      indexer.py             -- Text extraction from PDFs and markdown
      summarizer.py          -- Claim chunking and source summaries
      linker.py              -- Cross-paper relationship detection
      categorizer.py         -- Clustering and domain detection
      graph_builder.py       -- Knowledge graph construction
    dashboard/
      app.py                 -- Flask API (all endpoints)
      static/                -- Static assets
      templates/             -- Jinja2 HTML templates
    search/
      engine.py              -- BM25 search engine
      web.py                 -- Search API routes
  frontend/
    src/
      components/
        WikiView.tsx         -- Wikipedia-style wiki browser
        GraphView.tsx        -- D3.js knowledge graph visualization
        ChatView.tsx         -- Search and Q&A interface
        IdeasView.tsx        -- Product ideas explorer
        ResearchView.tsx     -- Source management and compile UI
        WikiEditor.tsx       -- Inline markdown editor
        WebClipperModal.tsx  -- Paste articles from the web
      services/              -- API client functions
      types.ts               -- TypeScript interfaces
  templates/
    prompts/                 -- 16 editable LLM prompt templates
  raw/                       -- Input papers (PDFs and markdown)
  wiki/                      -- Generated knowledge base
    claims/                  -- Atomic claims, one per file
    entities/                -- Evolving concept pages
    sources/                 -- Per-paper summary articles
    graph.json               -- Knowledge graph (nodes, edges, clusters, domains)
  config.yaml                -- Model and token settings
```

---

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

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `kb ingest` | Scan raw/ for new files |
| `kb compile` | Incremental compile (only new/modified papers) |
| `kb compile --full` | Full recompile from scratch |
| `kb dashboard --port 8888` | Start Flask API server |
| `kb search "query"` | Search from the command line |
| `kb qa "question"` | Ask a question with evidence trail |
| `kb lint` | Run health checks on the knowledge base |
| `kb status` | Show vault stats |

---

## What Makes It Different From RAG

RAG re-discovers knowledge from scratch on every question. IdeaForge compiles once and compounds forever. Cross-references are pre-built, contradictions pre-flagged, synthesis already done. Every new paper and every question makes the wiki richer.

---

## License

MIT
