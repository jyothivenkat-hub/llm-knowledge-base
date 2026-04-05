---
id: "flashattention-fast-and-memory-efficient-009"
type: "finding"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization-efficiency"
tags: ["performance-gap", "bottleneck", "hardware-limits"]
---

# The gap between theoretical peak FLOPS and practical performance on attention (even with FlashAttention-2 at 50-73%) reveals that memory bandwidth and non-matmul operations remain bottlenecks even after IO-aware optimization.

**Type:** finding
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** FlashAttention-2 section: achieves only 50-73% of theoretical peak FLOPS despite being highly optimized

## Tags
- [[performance-gap]]
- [[bottleneck]]
- [[hardware-limits]]
