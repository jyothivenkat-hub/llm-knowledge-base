# IdeaForge — How It Works

> From insights to product ideas

## Step 1: Upload Sources
- Drag & drop PDFs, markdown, or text files into the dashboard
- Or use the **Web Clipper bookmarklet** — click it on any webpage to clip the article directly
- Files go into `raw/articles/` or `raw/papers/`
- Ingest scans for new files, tracks them with SHA256 hashes in a manifest

## Step 2: Compile (Incremental)
The LLM processes **only new/modified papers** through a 7-stage pipeline:

1. **Extract text** — reads PDFs and markdown files
2. **Chunk** — breaks each paper into 5-30 atomic claims (one idea per claim)
3. **Connect** — finds cross-paper relationships (supports, contradicts, extends, causes, etc.)
4. **Cluster** — groups claims into research themes
5. **Entity pages** — creates/updates evolving concept pages (e.g., "Attention Mechanism" grows with each paper)
6. **Enrich** — finds contradictions, knowledge gaps, synthesis opportunities
7. **Product ideas** — generates 5-10 product concepts grounded in the research

Old claims from unchanged papers are preserved — only new stuff gets processed.

## Step 3: Explore
- **Graph** — interactive D3.js force-directed visualization of all claims and connections. Click nodes to see details, hover to highlight neighbors, filter by cluster or edge type, search within the graph
- **Wiki** — browse all papers with claim counts, read source summaries, see extracted claims per paper, view evolving entity pages
- **Insights panel** — contradictions, gaps, synthesis opportunities, bridge claims

## Step 4: Search & Ask
- Type any question
- BM25 finds matching claims across all papers + graph nodes
- LLM synthesizes an answer from claims + their graph connections
- Shows the **evidence trail** — ranked claims with type badges and source papers
- **File back to wiki** button saves the answer into raw/ for recompilation (your explorations compound)

## Step 5: Product Ideas
- 5-10 product ideas generated from research findings, gaps, and synthesis
- Each idea has: name, tagline, problem, solution, target audience, difficulty, novelty, revenue model, and the specific research evidence backing it

## Tools
- **Render** — generate Marp slideshows or matplotlib charts from wiki articles
- **Health checks** — find orphan pages, broken links, stale content, missing concepts, cross-article inconsistencies
- **Edit** — in-browser markdown editor on every wiki page
- **Log** — chronological record of every compile action

## What makes it different from RAG
- RAG re-discovers knowledge from scratch on every question
- IdeaForge **compiles once, compounds forever** — cross-references are pre-built, contradictions pre-flagged, synthesis already done
- Every new paper and every question makes the wiki richer
