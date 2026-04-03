---
id: "flashattention-fast-and-memory-efficient-007"
type: "method"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "transformer-architecture-attention"
tags: ["memory-optimization", "gpu-architecture", "attention-mechanism", "io-efficiency"]
---

# FlashAttention loads blocks of Q, K, V from HBM to SRAM, computes attention output in SRAM, and writes only final output back to HBM.

**Type:** method
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Detailed three-step process described in the IO-awareness section

## Tags
- [[memory-optimization]]
- [[gpu-architecture]]
- [[attention-mechanism]]
- [[io-efficiency]]
