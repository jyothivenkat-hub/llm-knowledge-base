---
id: "flashattention-fast-and-memory-efficient-003"
type: "method"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization"
tags: ["tiling", "attention", "memory-optimization"]
---

# Tiling breaks attention computation into blocks small enough to fit in SRAM, allowing Q, K, V blocks to be loaded once, processed entirely in fast memory, then written back—reducing HBM bandwidth by orders of magnitude.

**Type:** method
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Paper describes: 'Loading blocks of Q, K, V from HBM to SRAM, computing attention output for that block in SRAM, writing only final output back to HBM'

## Tags
- [[tiling]]
- [[attention]]
- [[memory-optimization]]
