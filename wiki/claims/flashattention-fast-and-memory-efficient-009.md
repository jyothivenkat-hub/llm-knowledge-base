---
id: "flashattention-fast-and-memory-efficient-009"
type: "method"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization"
tags: ["io-awareness", "gpu-optimization", "memory-access-pattern"]
---

# FlashAttention minimizes HBM reads/writes by loading Q, K, V blocks to SRAM, computing attention in SRAM, and writing only final output back

**Type:** method
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Detailed in IO-Awareness section as three-step process

## Tags
- [[io-awareness]]
- [[gpu-optimization]]
- [[memory-access-pattern]]
