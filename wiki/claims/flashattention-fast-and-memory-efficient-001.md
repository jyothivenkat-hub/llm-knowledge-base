---
id: "flashattention-fast-and-memory-efficient-001"
type: "concept"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization-efficiency"
tags: ["attention", "memory-complexity", "transformer"]
---

# Standard attention materializes the full N×N attention matrix, creating O(N²) memory complexity. FlashAttention computes exact attention without materializing this matrix, reducing memory to O(N).

**Type:** concept
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Key Ideas section: 'Standard attention has O(N^2) memory complexity due to materializing the attention matrix' vs 'FlashAttention computes attention without materializing the full N x N matrix'

## Tags
- [[attention]]
- [[memory-complexity]]
- [[transformer]]
