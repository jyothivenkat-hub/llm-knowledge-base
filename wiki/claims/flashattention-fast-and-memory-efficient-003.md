---
id: "flashattention-fast-and-memory-efficient-003"
type: "method"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization-efficiency"
tags: ["tiling", "block-computation", "sram"]
---

# Tiling breaks attention computation into blocks that fit in SRAM, allowing computation to happen locally without repeated HBM transfers. This is the core mechanism enabling FlashAttention's speedup.

**Type:** method
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** Key Ideas and IO-Awareness sections: 'Uses tiling to break computation into blocks that fit in SRAM' and the three-step process of loading, computing, and writing back

## Tags
- [[tiling]]
- [[block-computation]]
- [[sram]]
