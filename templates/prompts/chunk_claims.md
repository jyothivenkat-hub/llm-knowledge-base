You are extracting atomic claims from a research paper summary for a knowledge graph.

Paper title: {{ title }}
Paper source: {{ source_path }}

Paper content:
{{ content }}

Extract ALL distinct atomic claims, findings, methods, concepts, and hypotheses from this paper. Each claim should be ONE self-contained statement.

Return a JSON array where each item has:
- "text": the claim in one clear sentence
- "type": one of "finding", "claim", "method", "concept", "hypothesis"
- "tags": 2-5 lowercase keyword tags for cross-referencing with other papers
- "evidence": brief note on what supports this in the paper (1 sentence)

Rules:
- Extract 5-30 claims depending on paper complexity
- Each claim must be atomic — one idea per claim
- Tags should be general enough to match across papers (e.g., "attention-mechanism" not "flash-attention-v2-speedup")
- Include both major findings AND methodological details
- Preserve numerical results where present
- "concept" type is for definitions or explanations of key terms
- "hypothesis" type is for speculative or proposed ideas

Example output:
[
  {
    "text": "FlashAttention achieves 2-4x speedup over standard attention by minimizing HBM reads/writes",
    "type": "finding",
    "tags": ["attention-mechanism", "memory-efficiency", "gpu-optimization"],
    "evidence": "Benchmarked against PyTorch standard attention on A100 GPUs"
  }
]
