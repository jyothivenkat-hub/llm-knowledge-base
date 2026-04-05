---
id: "flashattention-fast-and-memory-efficient-002"
type: "concept"
source: "articles/flash-attention.md"
source_title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
cluster: "attention-optimization-efficiency"
tags: ["gpu-optimization", "memory-hierarchy", "io-efficiency"]
---

# IO-awareness—designing algorithms around GPU memory hierarchy constraints—is critical for performance. Modern GPUs have small fast SRAM (~20MB on A100) and large slow HBM (40-80GB), creating a bottleneck that standard attention ignores.

**Type:** concept
**Source:** FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness
**Evidence:** IO-Awareness section: detailed breakdown of SRAM vs HBM characteristics and how standard attention does many HBM reads/writes

## Tags
- [[gpu-optimization]]
- [[memory-hierarchy]]
- [[io-efficiency]]
