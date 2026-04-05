---
id: "flashattention-fast-and-memory-efficient-002"
type: "concept"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization"
tags: ["gpu-optimization", "memory-hierarchy", "io-awareness"]
---

# IO-aware algorithm design exploits GPU memory hierarchy: SRAM is fast but tiny (~20MB on A100), while HBM is large but slow (40-80GB). Minimizing HBM transfers is the bottleneck, not FLOPs.

**Type:** concept
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Paper defines memory hierarchy with specific capacities and identifies HBM reads/writes as the optimization target

## Tags
- [[gpu-optimization]]
- [[memory-hierarchy]]
- [[io-awareness]]
