---
id: "flashattention-fast-and-memory-efficient-004"
type: "method"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization"
tags: ["attention", "memory-compute-tradeoff", "backpropagation"]
---

# FlashAttention trades memory for compute by recomputing attention during the backward pass instead of storing it, reducing peak memory requirements without increasing total FLOPs significantly.

**Type:** method
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Paper states 'Recomputes attention during backward pass instead of storing it (trading compute for memory)'

## Tags
- [[attention]]
- [[memory-compute-tradeoff]]
- [[backpropagation]]
