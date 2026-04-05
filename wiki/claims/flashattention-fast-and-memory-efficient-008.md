---
id: "flashattention-fast-and-memory-efficient-008"
type: "concept"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization"
tags: ["gpu-optimization", "bottleneck-analysis", "memory-bandwidth"]
---

# The key bottleneck in modern GPU attention is not arithmetic operations but memory bandwidth—moving data between HBM and SRAM dominates wall-clock time, making IO-aware algorithm design critical.

**Type:** concept
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Paper's entire premise: standard attention does 'many HBM reads/writes' and FlashAttention 'minimizes these' to achieve speedup, implying memory is the constraint

## Tags
- [[gpu-optimization]]
- [[bottleneck-analysis]]
- [[memory-bandwidth]]
