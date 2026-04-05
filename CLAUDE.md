# IdeaForge — Wiki Schema

This document defines the structure, conventions, and workflows for maintaining the knowledge base wiki. It serves as the schema — the single source of truth for how the wiki is organized.

## Architecture

Three layers:

1. **raw/** — Immutable source documents. Never modified by the LLM. Source of truth.
2. **wiki/** — LLM-generated and maintained. Claims, entities, indexes, graph. The LLM owns this layer.
3. **This file (CLAUDE.md)** — Schema and conventions. Co-evolved by human and LLM.

## Directory Structure

```
raw/
  articles/          # Web clips, markdown articles
  papers/            # PDFs
  repos/             # Code repo notes
  images/            # Downloaded images
  _manifest.yaml     # Tracks all sources with SHA256 hashes

wiki/
  claims/            # Atomic claims, one per file (LLM-generated)
  entities/          # Evolving entity/concept pages (LLM-maintained)
  sources/           # Per-source summary pages
  _index.md          # Full catalog of everything in the wiki
  _summary.md        # High-level wiki overview
  _backlinks.yaml    # Reverse link index
  graph.json         # Knowledge graph (nodes, edges, clusters, ideas)
  graph_insights.json # Contradictions, gaps, synthesis
  log.md             # Chronological record of all actions

output/
  answers/           # Saved Q&A answers
  slides/            # Marp slideshows
  charts/            # Matplotlib images
```

## Conventions

### Claim files (`wiki/claims/*.md`)
- One atomic claim per file
- ID format: `{paper-slug}-{NNN}` (e.g., `attention-is-all-you-need-003`)
- Front matter: id, type, source, source_title, cluster, tags
- Types: `finding`, `claim`, `method`, `concept`, `hypothesis`
- Tags: lowercase-hyphenated keywords for cross-referencing

### Entity pages (`wiki/entities/*.md`)
- One page per major concept/entity (e.g., `attention-mechanism.md`)
- Evolves over time — updated when new papers mention the entity
- Front matter: title, related_claims, last_updated, source_count
- Sections: Overview, Key Findings, Methods, Open Questions, Sources
- Uses `[[wikilinks]]` to reference other entities and claims

### Source summaries (`wiki/sources/*.md`)
- One page per ingested source
- Front matter: title, source_url, date_summarized, concepts
- Sections: Brief, Summary, Key Concepts, Related Topics

### index.md
- Full catalog of every page in the wiki
- Each entry: `- [Title](path) — one-line summary`
- Organized by section: Entities, Claims by paper, Sources
- Updated on every compile

### log.md
- Append-only chronological record
- Format: `## [YYYY-MM-DD HH:MM] action | description`
- Actions: compile, ingest, query, lint

## Workflows

### Ingest a new source
1. Drop file into `raw/articles/` or `raw/papers/`
2. Run `kb ingest` — adds to manifest
3. Run `kb compile` — incrementally:
   - Chunks new source into claims
   - Finds connections to ALL existing claims
   - Updates clusters
   - Updates entity pages
   - Updates index.md
   - Appends to log.md

### Ask a question
1. Run search — BM25 finds relevant claims + graph context
2. LLM synthesizes answer from claims + connections
3. Optionally file answer back to raw/ for recompilation

### Lint
1. Run health checks: orphans, broken links, stale, contradictions
2. LLM suggests missing entities, new connections, gaps
3. Act on suggestions to improve wiki

## Link Syntax
- Use `[[wikilink]]` for all cross-references
- Entity links: `[[attention-mechanism]]`
- Claim links: `[[attention-is-all-you-need-003]]`
- Display text: `[[entity|Display Name]]`
