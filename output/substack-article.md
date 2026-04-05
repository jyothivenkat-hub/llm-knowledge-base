# I Built a System That Turns Research Papers Into a Living Wikipedia, Knowledge Graph, and Product Ideas

**Upload papers. AI extracts atomic claims. Out comes a beautiful wiki, interactive knowledge graph, evidence-backed search, and actionable product ideas.**

**Here's how to do it in 5 steps.**

---

## The Problem Nobody Talks About

You've been researching for years.

You've read hundreds of papers. You've highlighted findings. You've saved PDFs into folders called things like `attention_papers_v3_FINAL_REAL`. You've told yourself you'll organize them later.

You never did. Nobody does.

And here's the real cost: that neuroscience paper from last year that directly contradicts the scaling laws paper you read this week? You'll never notice. The thread connecting FlashAttention's memory optimization to how biological neurons actually process language? Buried across six different PDFs on your hard drive.

We don't have a knowledge problem. We have a **connection problem**.

Research lives in silos. Paper A sits in one folder. Paper B sits in another. The insight that emerges when you cross-reference them? It doesn't exist anywhere -- because no tool ever built it for you.

I decided to fix this.

---

## The Solution: What If We Built Wikipedia From Your Papers?

The idea is simple but powerful:

**Take all your studies. Chunk them into atomic micro-insights. Find every connection between them. Index everything. Build a Wikipedia you can ask questions to. Visualize it as a knowledge graph. And -- here's the twist -- generate product ideas from the whole thing.**

Not a folder of PDFs. Not a chatbot that forgets everything between sessions. A **living, compounding knowledge base** that gets smarter with every paper you add and every question you ask.

```
Upload papers
    -> AI extracts atomic claims
        -> Builds a beautiful wiki
        -> Interactive knowledge graph
        -> Evidence-backed search
        -> Actionable product ideas
```

I call it **IdeaForge**. It was inspired by Andrej Karpathy's approach to building personal knowledge systems with LLMs. He showed that you could use language models not just to summarize, but to *structure* knowledge. I took that idea and pushed it further: what if we built the full pipeline, from raw PDFs all the way to product concepts?

---

## The Core Insight

Here's what makes this fundamentally different from RAG, ChatGPT with uploaded files, or any "chat with your PDFs" tool:

**RAG re-discovers knowledge from scratch on every question.**

IdeaForge **compiles once, compounds forever.**

Cross-references are pre-built. Contradictions are pre-flagged. Synthesis is already done. The knowledge graph exists as a persistent artifact. Every new paper you add and every question you ask makes the wiki richer.

You never write the wiki. The LLM writes everything. You just steer -- and every answer compounds.

---

## The Architecture: Three Clean Layers

Before we dive into the steps, here's how the system is organized:

**Layer 1: Raw** -- Your source documents. PDFs, markdown articles, web clips. Immutable. Never touched after upload. These are your source of truth.

**Layer 2: Wiki** -- Everything the AI generates. Atomic claims, entity pages, source summaries, the knowledge graph, indexes, backlinks, product ideas. The LLM owns this layer entirely.

**Layer 3: Schema** -- The rules governing how the wiki is structured. What a claim looks like. How entities evolve. How links resolve.

The key design decision: your original papers are never modified. The compiled wiki can be regenerated at any time. And the compile is **incremental** -- only new or modified papers get processed. Old claims from unchanged papers are preserved.

---

## The 5 Steps: From Papers to Product Ideas

### Step 1: Upload Your Sources

Drop your research in. That's it.

- **PDFs of papers** -- drag and drop into the dashboard
- **Web articles** -- markdown files, text files, notes
- **Web Clipper** -- a browser bookmarklet that clips any webpage directly into the knowledge base

Files go into `raw/articles/` or `raw/papers/`. The system scans for new files, tracks them with SHA256 hashes in a manifest, and flags what needs processing.

You bring the research. IdeaForge does the rest.

### Step 2: Compile -- The 7-Stage LLM Pipeline

This is the engine. When you hit "Compile," the system runs **only new/modified papers** through seven stages:

**Stage 1 -- Extract text.** Reads PDFs and markdown files, pulling out clean text.

**Stage 2 -- Chunk into atomic claims.** This is where the magic starts. The system doesn't summarize your paper. It extracts **atomic claims** -- the individual insights a researcher would underline. The prompt is deliberately opinionated:

> *"Extract 8-15 key insights per paper. Quality over quantity. If you wouldn't tweet it, don't include it."*

Each claim gets a type:
- **Finding** -- a result backed by evidence (e.g., "FlashAttention achieves 2-4x speedup by reducing HBM reads/writes through tiling on A100 GPUs")
- **Method** -- a technique introduced (e.g., "Tiling breaks attention computation into SRAM-sized blocks")
- **Concept** -- a key idea defined (e.g., "IO-awareness means designing algorithms around the GPU memory hierarchy")
- **Hypothesis** -- a claim not yet proven

Each claim gets tags for cross-referencing and specific evidence from the paper. From 10 papers, IdeaForge extracted ~167 atomic claims. Not restated sentences -- genuine insights with citations.

**Stage 3 -- Connect across papers.** This is the step that makes everything worthwhile. The system takes all claims and asks: *how are these related?*

It finds typed relationships:
- **Supports** -- Claim A provides evidence for Claim B
- **Contradicts** -- these claims disagree (shown as dashed red lines in the graph)
- **Extends** -- Claim A builds on Claim B
- **Provides mechanism for** -- Claim A explains *how* Claim B works
- **Causes**, **is-part-of**, **related-to**, **uses-method**

The system prioritizes **cross-paper connections** over same-paper connections. That's the whole point. You already know what's inside a single paper. What you don't know is how Paper A's transformer findings connect to Paper B's neuroscience discoveries.

From 167 claims, the system found ~210 typed connections. Many of them I would never have noticed reading the papers individually.

**Stage 4 -- Cluster into themes.** Connected claims naturally group into research themes -- auto-detected, not imposed top-down. Each cluster gets a label, description, and list of constituent claims.

**Stage 5 -- Entity pages.** The system builds evolving concept pages. An entity page for "Attention" synthesizes insights from *every* paper that mentions attention. It has Overview, Key Findings, Methods, Open Questions, and Sources. As you add new papers, entity pages update automatically. One concept, many papers, one living page.

**Stage 6 -- Enrich.** The system analyzes the full graph for contradictions, knowledge gaps, synthesis opportunities, and bridge claims connecting distant research areas.

**Stage 7 -- Product ideas.** The system looks at findings, gaps, contradictions, and synthesis opportunities, then generates 5-10 product concepts grounded in your specific research. Not generic startup ideas -- ideas that reference specific claims and specific gaps.

### Step 3: Explore -- The Wiki and Knowledge Graph

After compile, you have two ways to explore:

**The Wiki** -- a Wikipedia-style interface. Browse all compiled articles with claim counts. Read source summaries. See evolving entity pages that synthesize across papers. Navigate between articles through wikilinks. Every concept links to every other concept it touches.

**The Knowledge Graph** -- an interactive D3.js force-directed visualization. Nodes are claims, colored by research cluster. Edges show typed relationships. Hover over a node to highlight its neighborhood. Click to see the full text and connections. Contradictions appear as dashed red lines. You can see at a glance where your research clusters, where it bridges, and where the gaps are.

### Step 4: Search and Ask Questions

Type any question. The system:

1. **Searches** -- BM25 finds matching claims across all papers + graph nodes
2. **Gathers context** -- pulls in graph connections, neighboring claims, relevant edges
3. **Synthesizes** -- an LLM composes an answer from claims + their connections
4. **Shows evidence** -- a ranked evidence trail with type badges, source papers, and relevance scores

Ask "How do transformer layers map to brain regions?" and you get a synthesized answer drawing from neuroscience papers *and* architecture papers, with every claim cited.

And here's what makes it compound: the **"File back to wiki"** button saves your answer into `raw/` for recompilation. Your questions become part of the knowledge base. Every exploration makes the wiki richer.

### Step 5: Product Ideas

The final output that surprised even me.

The system analyzes the full knowledge graph -- clusters, gaps, contradictions, synthesis opportunities -- and generates 5-10 product ideas grounded in your research.

Each idea includes:
- **Name and tagline** -- a clear pitch
- **Problem** -- what it solves (referencing specific findings/gaps)
- **Solution** -- how it works
- **Target audience** -- who would use it
- **Difficulty** -- low, medium, or high engineering effort
- **Novelty** -- incremental, significant, or breakthrough
- **Revenue model** -- how it could make money
- **Research evidence** -- the specific claims backing it

These aren't generic ideas. They're uniquely enabled by *your* research corpus. From insights to products.

---

## What You Get: The Full Output

After running the pipeline on 10 research papers, here's what IdeaForge produced:

| Output | Count |
|--------|-------|
| Atomic claims | ~167 |
| Typed connections | ~210 |
| Research clusters | Auto-detected themes |
| Entity pages | Evolving concept pages |
| Source summaries | One per paper |
| Product ideas | 5-10 grounded concepts |
| Knowledge graph | Interactive D3.js visualization |

Plus: a full-text search engine, an evidence trail for every answer, a wiki editor, a web clipper, health checks for finding broken links and orphan pages, and a log of every compile action.

---

## The Tools That Come With It

Beyond the core pipeline, IdeaForge includes:

- **Wiki Editor** -- in-browser markdown editing on every page. Refine the AI's output, add your own notes, fix inaccuracies. The system is a starting point, not a final product.
- **Web Clipper** -- clip articles from any browser directly into the knowledge base
- **Health Checks** -- find orphan pages, broken links, stale content, missing concepts, cross-article inconsistencies
- **Render** -- generate Marp slideshows or matplotlib charts from wiki articles
- **Smart Search caching** -- answers are cached so repeated questions are instant

---

## What Makes This Different

**vs. Notion/Obsidian** -- Those are note-taking tools. *You* do the organizing. Here, the AI organizes. You just upload papers.

**vs. ChatGPT/Claude with uploaded files** -- Those give you a conversation that evaporates. This gives you a persistent, navigable, interlinked knowledge base that grows over time.

**vs. Semantic Scholar/Connected Papers** -- Those show citation relationships between papers. This goes deeper -- it finds conceptual relationships between specific *claims*. "Paper A's finding about X provides the mechanism for Paper B's hypothesis about Y."

**vs. RAG pipelines** -- RAG re-discovers knowledge on every query. IdeaForge compiles once and compounds. The knowledge graph is a persistent artifact, not a runtime computation.

---

## The Tech Stack (For Builders)

If you want to build this yourself:

- **Backend**: Python + Flask. Handles LLM calls, file management, search indexing, compilation. All data stored as JSON and markdown files -- no database.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS. Wikipedia-inspired design. D3.js for the knowledge graph.
- **LLM**: Claude (Anthropic API) for extraction, connection-finding, clustering, entity generation, and search synthesis. The prompt templates are the core -- they're what make output quality high.
- **Search**: BM25 over wiki content + graph nodes, with LLM synthesis on top.
- **Compile**: Incremental. SHA256 tracking. Only new/modified papers get processed.
- **Deployment**: Runs locally (papers never leave your machine). Optional Vercel deployment for a read-only demo.

---

## Try It

The project is open source.

**Live demo**: [llm-knowledge-base-nine.vercel.app](https://llm-knowledge-base-nine.vercel.app) -- browse the compiled wiki, explore the knowledge graph, try cached search answers.

**GitHub**: [github.com/jyothivenkat-hub/llm-knowledge-base](https://github.com/jyothivenkat-hub/llm-knowledge-base)

To run the full pipeline with your own papers:

1. Clone the repo
2. Set your Anthropic API key in `.env`
3. Drop PDFs/markdown into `raw/papers/` or `raw/articles/`
4. Start the backend: `kb dashboard --port 8888`
5. Start the frontend: `cd frontend && npm run dev`
6. Open http://localhost:3000 -> Sources -> Compile
7. Watch your personal Wikipedia build itself

---

## What I Learned Building This

The connections between papers are more valuable than the papers themselves.

Any individual paper is a snapshot. But when you extract the atomic insights and map the relationships, patterns emerge that no single paper could reveal. Contradictions surface. Gaps become visible. And product ideas -- real, grounded, specific ones -- fall out naturally from the structure.

The future of research isn't reading more papers. It's building better structures to hold what we've already read.

**Compile once. Compound forever.**

---

*Inspired by Andrej Karpathy's LLM Knowledge Base. Deep dive into his original approach [here].*

*If this was useful, subscribe for more deep dives on building AI-powered knowledge systems.*
