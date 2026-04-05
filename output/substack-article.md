# I Built a System That Turns Research Into a Living Wiki, Knowledge Graph, and Product Ideas

You can go from findings to your next product idea in 5 steps.

Researchers have a hoarding problem. Over years of work, we conduct dozens of studies, publish papers, and store them in digital graveyards like Google Drive.

The tragedy? These insights exist in isolation. There is no automated way to cross connect a finding from 2022 with a contradiction discovered in 2026. We are essentially building a library where the books cannot talk to each other. Until now.

Inspired by Andrej Karpathy's vision of an LLM driven knowledge base, I want to introduce a framework for Dynamic Wikipedia: a system that turns raw research or any data sources into a living, breathing Wiki, complete with interactive knowledge graphs and actionable product ideas.

This is completely open source, please download git and play around, open to chatting or any feedback.

---

## Try It

The project is open source.

- **Live demo:** [llm-knowledge-base-nine.vercel.app](https://llm-knowledge-base-nine.vercel.app)
- **GitHub:** [github.com/jyothivenkat-hub/llm-knowledge-base](https://github.com/jyothivenkat-hub/llm-knowledge-base)

Compile once go from insights to product ideas or idea for your next research paper in minutes!

---

## The Problem: The "Repository Silo"

Traditional research storage is linear and static. You have:

- **The Search Burden:** You have to remember which research had that specific claim.
- **No actioning:** A lot of research from the past just sitting with no actioning.
- **The Synthesis Gap:** Human brains struggle to track thousands of typed connections across hundreds of research.
- **Zero Compounding:** Your knowledge stays the same size unless you manually write a review or connect them.

---

## The Solution: The Compile Once, Compound Forever Model

- Instead of just searching your PDFs, this tool compiles them.
- Compiling is it breaks down studies or any data into micro bits (atomic claims), indexes them, and maps their relationships.
- It does not just store information; it generates a Wiki page, Knowledge Graph and Product Ideas based on the gaps in your research.

---

## How it Works: The 5 Step Deep Dive

### 1. Ingest: Upload Your Sources

Drop your research in. That's it.

- **PDFs of research or papers:** drag and drop into the dashboard
- **Web articles:** markdown files, text files, notes
- **Web Clipper:** a browser bookmarklet that clips any webpage directly into the knowledge base

Files go into raw/articles/ or raw/papers/. The system scans for new files, tracks them in a manifest, and flags what needs processing.

Once you are done adding, click on Compile, go to step 2.

Let us take an example: What actually makes people sleep better? You have collected five studies over the past year:

- One about how exercise affects sleep.
- One about how screen time affects sleep.
- One about caffeine and sleep.
- One about stress, anxiety, and insomnia.
- One about gut bacteria and sleep.

Five PDFs. Five different folders on your laptop, you add them to raw/papers/ and click on Compile. You can substitute this with your customer service data, various research customer data or product analytics data. Provide the data and hit Compile.

---

### 2. Compile: The 7 Stage Pipeline

This is the most important step. The system does NOT write you a summary. Instead, it pulls out the individual findings, the specific things you would highlight with a marker.

This is the engine. When you hit Compile, the system runs, only new/modified papers through seven stages:

**Stage 1: Extract text,** reads PDFs and markdown files, pulling out clean text.

**Stage 2: Chunk into atomic claims.** This is the most important step, the system does not summarize your paper. Instead, it pulls out the individual findings, the specific things you would highlight with a marker.

- Exercise study: "People who exercised 4 times a week for 30 minutes fell asleep faster."
- Caffeine study: "A coffee at 2pm can still steal one hour of deep sleep that night."

Each study produces 5 to 30 atomic claims, ensuring each represents a single, discrete idea.

**Stage 3: Classify and tag.** Each finding gets a label and keywords:

- **Finding:** A proven result (e.g., "FlashAttention achieves 2-4x speedup").
- **Method:** A technique (e.g., "Measured sleep chemicals in saliva every 30 minutes").
- **Concept:** A key idea (e.g., "Circadian rhythm").
- **Hypothesis:** An unproven idea.

**Stage 4: Connect.** The LLM identifies cross research and paper relationships, determining if a claim supports, contradicts, extends, or causes another.

- It finds that blue light (from the screen study) and exercise (from the exercise study) both affect the same sleep chemical.
- It identifies that stress causes phone scrolling, which creates blue light, forming a vicious cycle across multiple studies.

**Stage 5: Cluster.** Individual claims are grouped together into broader research themes. Group into topics like "Light and Your Body Clock" or "Exercise and Sleep."

**Stage 6: Entity pages.** The system builds Wikipedia style pages for concepts like "Melatonin," synthesizing insights from every paper that mentions it. One concept with five studies in one article page.

**Stage 7: Enrich.** The pipeline proactively identifies contradictions, knowledge gaps, and synthesis opportunities within the data. e.g., "No study tested morning exercise combined with no screens"

Note: This can take a bit of time around few mins for 5 studies compiling, as it has to break everything into chunks.

---

### 3. Explore: The Interactive Knowledge Graph

Rather than scrolling through a list of files, you navigate a force directed visualization.

- **Nodes** are your claims.
- **Edges** are the relationships (evidence, contradictions, etc.).
- **Clusters** show you which research themes are emerging naturally from your data.

Example below, has two core themes, circadian rhythms and sleep quality. You can click on each individual dots to see what the research claims.

---

### 4. Search & Ask: The Evidence Trail

When you ask a question, the system searches claims and graph nodes, gathers connections, and synthesizes an answer with an Evidence Trail. You see the specific source paper and the type badge (Finding, Contradiction) that justifies the answer.

**The Compound Effect.** You can "File back to wiki," saving AI generated answers back into the system to be recompiled. The machine gets smarter with every question.

---

### 5. Productize: From Insights to Action

The final leap is the most powerful. IdeaForge analyzes your research gaps and synthesis opportunities to generate 5 to 10 grounded product concepts.

- **Problem + Solution:** Directly mapped to research findings.
- **Evidence Backing:** Every idea includes a link to the specific paper that proves the market or technical need.
- **The Details:** It handles the tagline, target audience, and even the revenue model.

You can now take this and put it into Claude/ Google AI Studio or Lovable and generate a prototype.

I used the SleepScore Idea as a prompt on Google AI Studio, to generate a prototype below:

---

## Challenges and How to Address Them

Building a living knowledge base is not without its hurdles. Here is how to handle the "rough edges" of the pipeline:

- **Granularity of Claims:** Compile results need careful review to ensure chunks are at the right level of detail. If a claim is too broad or too narrow, you should dive into the code and adjust the chunking logic to fit your specific research style.
- **Compute Bottlenecks:** Processing 20+ files simultaneously consumes significant compute and takes a long time. To avoid system lag, run large batches overnight via the terminal or adopt a "one paper at a time" workflow to keep the knowledge base updated incrementally.
- **Scaling API Costs:** Maintaining a sophisticated pipeline can get expensive quickly. To keep costs sustainable, consider switching to a cheaper model like Claude Haiku or hosting a local model for the initial extraction stages.

---

## What Makes This Different

- **Generative Leverage.** It doesn't just store; it generates ideas for products, marketing strategies, or even your next research paper, giving you a competitive edge in how you apply your knowledge.
- **Self-Indexing Growth.** You set it up once and it continues to grow and self-index as you add more sources.
- **vs. Notion/Obsidian.** Those are note-taking tools where you do the organizing. Here, the AI organizes for you.
- **vs. ChatGPT/Claude.** Those provide conversations that disappear. This creates a persistent, interlinked knowledge base.
- **vs. Semantic Scholar.** Those show citation links. This finds conceptual relationships between specific claims.
- **vs. RAG pipelines.** Standard RAG re discovers knowledge on every query. This tool compiles once and compound.

---

## Ready to Build Your Own?

If you're a builder, the project is fully open-source. You can get Jyothipedia running locally in under 5 minutes:

1. Clone the repo from GitHub.
2. Add your Anthropic API Key to a .env file.
3. Run the install script and start dropping your PDFs into the raw folder.

Full technical documentation is available in the README for those who want to dive deeper into the chunking logic or graph parameters.
