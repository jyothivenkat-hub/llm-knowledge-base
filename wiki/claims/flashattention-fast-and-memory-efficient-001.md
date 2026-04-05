---
id: "flashattention-fast-and-memory-efficient-001"
type: "concept"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization"
tags: ["attention", "memory-efficiency", "algorithmic-complexity"]
---

# Standard attention materializes the full N×N attention matrix, creating O(N²) memory complexity. FlashAttention eliminates this by computing attention in tiles that fit in SRAM, reducing memory to O(N).

**Type:** concept
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Paper states 'Standard attention has O(N^2) memory complexity due to materializing the attention matrix' and 'Reduces memory from O(N^2) to O(N)'

## Tags
- [[attention]]
- [[memory-efficiency]]
- [[algorithmic-complexity]]
