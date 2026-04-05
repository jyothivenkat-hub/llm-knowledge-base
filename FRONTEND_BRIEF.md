# IdeaForge — Frontend Brief

IdeaForge turns research papers into a wiki and a knowledge graph, then generates actionable product ideas from the findings.

Users upload research — PDFs, articles, notes, web clips. The system breaks each paper into atomic claims (one idea = one unit) and generates a **wiki** of claims and evolving concept pages you can browse and read. It also generates a **knowledge graph** mapping how those claims connect across papers — supports, contradicts, extends. You browse the wiki to read. You explore the graph to see relationships. You search both to get synthesized answers.

The frontend needs to let users:

- **Add research** — upload files or clip content from the web
- **Run the compiler** — trigger the LLM pipeline and see progress as it processes papers into the wiki and knowledge graph
- **Browse the wiki** — read atomic claims, evolving concept pages, and source summaries. Edit content inline.
- **Explore the knowledge graph** — visualize claims and their connections, browse by cluster or paper, see contradictions and gaps
- **Ask questions** — natural language search that synthesizes answers from the wiki and graph, shows evidence trails, and lets users file answers back into the knowledge base so it grows with use
- **View product ideas** — see generated ideas with their problem, solution, audience, difficulty, and the specific research backing each one

The system has two modes: full mode (with API key, everything works) and demo mode (pre-built wiki, graph, and cached answers — read-only, zero cost).

A Python/Flask backend with JSON APIs and SSE streaming is already built. Sample dataset included: 10 papers, 167 claims, 210 connections, 7 clusters, 8 product ideas.
