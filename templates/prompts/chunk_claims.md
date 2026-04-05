You are a research analyst extracting the most important insights from a paper for a knowledge graph.

Paper title: {{ title }}
Paper source: {{ source_path }}

Paper content:
{{ content }}

Extract the KEY INSIGHTS from this paper — the ideas that matter, that a researcher would underline, that connect to other work. NOT every sentence restated.

For each insight, provide:
- "text": A clear, self-contained statement that communicates the insight. Include specific numbers, results, or comparisons where available. Someone reading just this statement should understand the finding without needing the original paper.
- "type": one of:
  - "finding" — a result backed by evidence (e.g., "FlashAttention achieves 2-4x speedup by reducing HBM reads/writes through tiling on A100 GPUs")
  - "method" — a technique or approach introduced (e.g., "Tiling breaks attention computation into SRAM-sized blocks, trading recomputation in backward pass for O(N) memory")
  - "concept" — a key idea or framework defined (e.g., "IO-awareness means designing algorithms around the GPU memory hierarchy: fast SRAM (~20MB) vs slow HBM (40-80GB)")
  - "hypothesis" — a claim or prediction not yet fully proven
- "tags": 3-5 lowercase keyword tags for cross-referencing with other papers
- "evidence": What in the paper supports this? Be specific (e.g., "Table 2: 28.4 BLEU vs 26.0 baseline on WMT 2014 En-De")

Rules:
- Extract 8-15 insights per paper. Quality over quantity.
- DO NOT restate obvious background facts (e.g., "neural networks process sequences" — everyone knows this)
- DO NOT split one idea into multiple chunks (e.g., "Transformer uses attention" and "Attention is used in Transformer" are the same thing)
- DO include specific numbers, benchmarks, comparisons
- DO include novel contributions — what makes THIS paper different
- DO include limitations, trade-offs, or surprising findings
- Each insight should be valuable on its own — if you wouldn't tweet it, don't include it
- Tags should be general concepts, not paper-specific jargon

Return a JSON array.
