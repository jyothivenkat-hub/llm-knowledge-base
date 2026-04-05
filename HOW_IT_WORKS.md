# IdeaForge — How It Works

> From insights to product ideas

## Step 1: Upload Sources
- Drag and drop PDFs, markdown, or text files into the dashboard
- Or use the **Web Clipper** in the sidebar to paste article content directly
- Files go into `raw/articles/` or `raw/papers/`
- Ingest scans for new files, tracks them with SHA256 hashes in a manifest

## Step 2: Compile (Incremental)
The LLM processes **only new/modified papers** through an 8-stage pipeline:

1. **Extract text** — reads PDFs and markdown files
2. **Chunk** — breaks each paper into 5-30 atomic claims (one idea per claim)
3. **Connect** — finds cross-paper relationships (supports, contradicts, extends, causes, etc.)
4. **Cluster** — groups claims into research themes (5-10 clusters)
5. **Detect domains** — groups clusters into 3-6 broad research areas (like Wikipedia portals). Generates "Did You Know" facts and cross-domain bridge insights. Facts must be accurate (backed by real findings), simple (an 8-year-old can understand), and short (max 15 words).
6. **Entity pages** — creates/updates evolving concept pages (e.g., "Attention" grows with each paper)
7. **Enrich** — finds contradictions, knowledge gaps, synthesis opportunities
8. **Product ideas** — generates 5-10 product concepts grounded in the research

Old claims from unchanged papers are preserved — only new stuff gets processed.

## Step 3: Explore
- **Main Page** — 3-level Wikipedia-style navigation:
  - Level 1: Domain cards with "Did You Know" facts and bridge insights
  - Level 2: Domain portal with filtered clusters, articles, entities, bridges
  - Level 3: Full article or entity page with breadcrumb navigation
- **Graph** — interactive D3.js force-directed visualization. Filter by domain (dropdown) or cluster (clickable themes on left). Click nodes to see details, hover to highlight neighbors.
- **Wiki** — browse all papers with claim counts, read source summaries, view evolving entity pages
- **Sources** — papers grouped by domain with claim counts and status

## Step 4: Search & Ask
- Type any question
- BM25 finds matching claims across all papers + graph nodes
- LLM synthesizes an answer from claims + their graph connections
- Shows the **evidence trail** — ranked claims with type badges and source papers
- Answers are auto-cached for instant repeat lookups. "Refresh" button forces a live re-query.
- **File back to wiki** button saves the answer into raw/ for recompilation (your explorations compound)

## Step 5: Product Ideas
- 5-10 product ideas generated from research findings, gaps, and synthesis
- Each idea has: name, tagline, problem, solution, target audience, difficulty, novelty, revenue model, and the specific research evidence backing it

## Tools
- **Web Clipper** — clip articles from any browser into the knowledge base
- **Wiki Editor** — in-browser markdown editing on every wiki and entity page
- **Health checks** — find orphan pages, broken links, stale content, missing concepts
- **Render** — generate Marp slideshows or matplotlib charts from wiki articles
- **Log** — chronological record of every compile action

## "Did You Know" Quality Rules
Facts on the main page are auto-generated but must follow strict rules:

1. **Accuracy first** — every fact must come from a specific finding in the graph. No invented connections. Keep real numbers.
2. **Simple language** — max 15 words, no jargon, no dashes or quotes. Written for an 8 year old.
3. **Post-processing** — the pipeline strips em dashes, quotes, and emojis automatically.
4. **Bridge facts** — must connect findings from different domains. If no real connection exists, fewer facts are better than false ones.

## What makes it different from RAG
- RAG re-discovers knowledge from scratch on every question
- IdeaForge **compiles once, compounds forever** — cross-references are pre-built, contradictions pre-flagged, synthesis already done
- Every new paper and every question makes the wiki richer
