# I Built a System That Turns Research Papers Into a Living Wikipedia, Knowledge Graph, and Product Ideas

Researchers have a hoarding problem. Over years of work, we conduct dozens of studies, publish papers, and store them in digital graveyards like Google Drive folders named things like `sleep_papers_v3_FINAL`.

The tragedy? These insights exist in isolation. There is no way to automatically cross connect a finding from 2022 with a contradiction discovered in 2026.

We are building a library where the books cannot talk to each other.

Until now.

Inspired by Andrej Karpathy's vision of an LLM driven knowledge base, I built a framework for a Dynamic Research Wikipedia. A system that turns raw research into a living, breathing encyclopedia, complete with an interactive knowledge graph and actionable product ideas.

---

## The Problem: The Repository Silo

Traditional research storage is linear and static. You have:

**The Search Burden.** You have to remember which paper had that specific claim about caffeine and sleep. Was it the 2024 study or the 2025 one?

**The Synthesis Gap.** Human brains struggle to track 210+ typed connections across hundreds of pages. You read five papers about sleep. Each one has 10 key findings. That is 50 findings with potentially hundreds of connections between them. No one can hold all of that in their head.

**Zero Compounding.** Your knowledge stays the same size unless you manually sit down and write a literature review. Every paper you read is a one time event. Nothing builds on itself.

---

## The Solution: Compile Once, Compound Forever

Instead of just searching your PDFs (that is standard RAG), this tool compiles them.

It breaks studies into micro bits (atomic claims), indexes them, and maps their relationships. It does not just store information. It generates a Knowledge Graph and Product Ideas based on the gaps in your research.

Upload papers. AI extracts atomic claims. Out comes a beautiful wiki, interactive knowledge graph, evidence backed search, and actionable ideas.

---

## How It Works: The 5 Step Deep Dive

### Step 1: Ingest. Upload Your Sources.

Drop your research in. That is it.

- PDFs of research or papers. Drag and drop into the dashboard.
- Web articles. Markdown files, text files, notes.
- Web Clipper. A tool in the sidebar that lets you paste any webpage directly into the knowledge base.

Files go into the raw folder. The system scans for new files, tracks them with hashes, and flags what needs processing.

You bring the research. The tool does the rest.

---

### Step 2: Compile. The 7 Stage Pipeline.

This is where the magic happens. When you hit Compile, the system runs only new or modified papers through seven stages.

Let me show you what actually happens with a simple example.

Say you are trying to answer one question: **What actually makes people sleep better?**

You have collected five studies over the past year:
- One about how exercise affects sleep
- One about how screen time affects sleep
- One about caffeine and sleep
- One about stress, anxiety and insomnia
- One about gut bacteria and sleep

Five PDFs. Five different folders on your laptop. You have read them all but you have never sat down and connected the dots between them.

Here is what happens when you hit Compile:

**Stage 1. Extract.** The system reads your PDFs and pulls out clean text. Nothing fancy. Just getting the words out so the AI can work with them.

**Stage 2. Chunk into atomic claims.** This is the most important step. The system does NOT write you a summary. Instead, it pulls out the individual findings. The specific things you would highlight with a marker.

From the exercise study:
> "People who exercised 4 times a week for 30 minutes fell asleep faster and slept longer."

From the screen time study:
> "Two hours of phone time before bed cuts your sleep chemical in half."

From the caffeine study:
> "A coffee at 2pm can still steal one hour of deep sleep that night."

From the stress study:
> "Stress starts a chain reaction. It causes worry, which causes phone scrolling, which causes blue light, which kills sleep."

From the gut bacteria study:
> "Certain gut bacteria help produce the chemicals your brain needs to fall asleep."

Each study produces 5 to 30 of these bite sized findings. Not vague summaries. Specific, usable facts you could actually tell a friend.

**Stage 3. Classify and tag.** Each finding gets a label and keywords:

- **Finding**: a proven result. "A coffee at 2pm still costs you one hour of deep sleep."
- **Method**: a technique. "Measured sleep chemicals in saliva every 30 minutes."
- **Concept**: a key idea. "Your body has a 24 hour clock that controls when you feel sleepy."
- **Hypothesis**: an unproven idea. "Fixing gut bacteria might fix sleep problems too."

**Stage 4. Connect across studies.** Here is where it gets interesting. The system looks at ALL the findings from ALL five studies and asks: how are these related?

It finds things like:

The screen time study says blue light blocks your sleep chemical. The exercise study says exercise helps produce that same chemical. **These are two sides of the same coin.** Screens take it away, exercise builds it back.

The stress study says worry leads to phone scrolling at night. The screen time study says phones block your sleep chemical. **These compound.** Stress makes you grab your phone, and your phone makes the sleep problem worse. A vicious cycle no single study could reveal.

The caffeine study says coffee blocks the molecule that makes you sleepy. The stress study says anxiety also blocks that molecule through a different path. **Same target, different weapons.** Nobody designed that experiment but the system flags it.

That last one? You would almost certainly miss it reading the papers one by one. The system catches it automatically.

**Stage 5. Cluster into themes.** The connected findings naturally group into bigger topics:

- "Light and Your Body Clock" (sunlight plus screens plus sleep chemicals)
- "Exercise and Sleep" (physical activity plus anxiety reduction)
- "Stress and the Sleep Spiral" (worry plus phones plus blue light)
- "What You Put In Your Body" (caffeine plus gut bacteria)

You did not create these categories. They emerged from the connections.

**Stage 6. Entity pages.** The system builds Wikipedia style pages for each concept. The page for "Melatonin" pulls together what the screen study says about blue light blocking it, what the exercise study says about building it up, what the caffeine study hints about coffee interfering with it, and what the gut bacteria study says about producing it.

One concept. Four different studies. One living page. And next month when you add a new study about melatonin supplements, the page updates itself.

**Stage 7. Enrich.** Finally, the system zooms out and flags the big picture insights:

- **Gap found**: "All five studies looked at sleep factors one at a time. No study tested what happens when you combine morning exercise, no screens, and no afternoon coffee."
- **Synthesis opportunity**: "Exercise, screen limits, and caffeine timing all affect the same sleep chemical through different paths. A combined protocol could be more powerful than any single change."
- **Surprise connection**: "The caffeine study and the stress study both point to the same molecule through completely different paths. One through coffee, one through anxiety."

These are the kinds of insights that take weeks of careful reading to develop on your own. The system generates them in minutes.

---

### Step 3: Explore. The Interactive Knowledge Graph.

Rather than scrolling through a list of files, you navigate a force directed visualization.

- Nodes are your claims. Each dot is one finding from one paper.
- Edges are the relationships. Evidence, contradictions, extensions.
- Clusters show you which research themes are emerging naturally from your data.
- Domains group clusters into big topics. Filter by "Sleep Science" or "AI Foundations" with one click.

You can see at a glance where your research clusters, where it bridges across topics, and where the gaps are.

---

### Step 4: Search and Ask. The Evidence Trail.

When you ask a question, the system does not just give you a paragraph of text. It searches across all claims and graph nodes, gathers connections, synthesizes an answer, and shows you the Evidence Trail. You see the specific source paper and the type badge (finding, contradiction, method) that justifies the answer.

Ask "What destroys deep sleep the most?" and you get a synthesized answer pulling from the caffeine study AND the screen time study AND the stress study, with every claim cited.

**The Compound Effect.** You can "File back to wiki", saving your AI generated answers back into the system to be recompiled. The machine gets smarter with every question you ask.

---

### Step 5: Ideas. From Insights to Action.

The final leap is the most powerful. The system analyzes your research gaps and synthesis opportunities to generate 5 to 10 grounded product concepts.

- **Problem plus Solution.** Directly mapped to research findings.
- **Evidence Backing.** Every idea includes a link to the specific paper that proves the need.
- **The Details.** It handles the tagline, target audience, difficulty level, and even the revenue model.

These are not generic startup ideas. They come directly from what your research says is missing, broken, or possible.

---

## What You Get

After running the pipeline on 16 research papers, here is what the system produced:

- 161 atomic claims (genuine insights, not restated sentences)
- 205 typed connections (supports, contradicts, extends)
- 9 research clusters (auto detected themes)
- 4 research domains (high level portals like Wikipedia)
- 33 evolving entity pages (concepts that grow with each paper)
- 8 product ideas (grounded in specific findings and gaps)
- "Did You Know" facts surfacing surprising cross domain connections

Plus a full text search engine, an evidence trail for every answer, a wiki editor, a web clipper, and health checks for finding broken links and orphan pages.

---

## What Makes This Different

**vs. Notion or Obsidian.** Those are note taking tools. You do the organizing. Here, the AI organizes. You just upload papers.

**vs. ChatGPT or Claude with uploaded files.** Those give you a conversation that disappears. This gives you a persistent, navigable, interlinked knowledge base that grows over time.

**vs. Semantic Scholar or Connected Papers.** Those show citation relationships between papers. This goes deeper. It finds conceptual relationships between specific claims. "Paper A says caffeine blocks adenosine. Paper B says stress also blocks adenosine. Same molecule, different paths."

**vs. RAG pipelines.** RAG re discovers knowledge on every query. This tool compiles once and compounds. The knowledge graph is a persistent artifact, not a runtime computation.

---

## What You Need to Get Started

To build this, you move beyond simple RAG. You need:

- **Markdown first storage.** For your evolving wiki. All content is JSON and markdown files. No database.
- **A graph visualization.** D3.js force directed graph to see the 210 typed connections.
- **An incremental pipeline.** So you are not re processing and paying for the same papers every day. SHA256 hash tracking ensures only new papers get compiled.
- **An LLM with good prompts.** Claude via the Anthropic API. The prompt templates are the core. They are what make output quality high.

---

## Try It

The project is open source.

**Live demo**: [llm-knowledge-base-nine.vercel.app](https://llm-knowledge-base-nine.vercel.app)

**GitHub**: [github.com/jyothivenkat-hub/llm-knowledge-base](https://github.com/jyothivenkat-hub/llm-knowledge-base)

To run the full pipeline with your own papers:

1. Clone the repo
2. Set your Anthropic API key
3. Drop PDFs into the raw folder
4. Start the backend and frontend
5. Go to Sources. Scan. Compile.
6. Watch your personal Wikipedia build itself.

**Compile once. Compound forever.**

---

*Inspired by Andrej Karpathy's LLM Knowledge Base concept.*

*If this was useful, subscribe for more deep dives on building AI powered knowledge systems.*
