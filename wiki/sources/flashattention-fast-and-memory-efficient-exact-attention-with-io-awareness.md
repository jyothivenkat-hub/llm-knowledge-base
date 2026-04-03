---
title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
source_url: "https://arxiv.org/abs/2205.14135"
date_summarized: "2026-04-02"
concepts:
  - flash-attention
  - io-aware-algorithms
  - attention-mechanism
  - memory-optimization
  - gpu-memory-hierarchy
  - tiling-computation
  - sequence-length-scaling
---

## Brief
FlashAttention is an IO-aware exact attention algorithm that uses tiling to reduce memory reads/writes between GPU HBM and SRAM, achieving 2-4x speedup and enabling longer sequence training. It reduces attention's memory complexity from O(N²) to O(N) without approximation by computing attention in blocks that fit in fast on-chip memory.

## Summary
FlashAttention addresses the memory bottleneck in standard attention mechanisms by leveraging GPU memory hierarchy awareness. Traditional attention algorithms suffer from O(N²) memory complexity due to materializing the full attention matrix, requiring frequent slow memory accesses between GPU high bandwidth memory (HBM) and on-chip SRAM.

The algorithm's core innovation is using tiling to break attention computation into blocks that fit entirely in fast SRAM (~20MB on A100 GPUs). Instead of materializing the full N×N attention matrix in slow HBM (40-80GB), FlashAttention loads blocks of queries (Q), keys (K), and values (V) from HBM to SRAM, computes attention output for each block in fast memory, and writes only final outputs back to HBM. This dramatically reduces the number of expensive HBM reads/writes.

During the backward pass, FlashAttention recomputes attention values instead of storing them, trading additional computation for memory savings. This approach reduces overall memory complexity from O(N²) to O(N) while maintaining exact attention computation.

Results demonstrate 2-4x wall-clock speedup over optimized PyTorch implementations and enable training with sequences up to 16K tokens. The algorithm has been adopted in production large language models including GPT-4.

FlashAttention-2 provides further improvements by better parallelizing across sequence length dimensions and reducing non-matrix multiplication operations, achieving up to 2x speedup over the original FlashAttention and reaching 50-73% of theoretical peak FLOPS on A100 GPUs.

## Key Concepts
- [[flash-attention]] — IO-aware exact attention algorithm using tiling to minimize memory transfers between GPU HBM and SRAM
- [[io-aware-algorithms]] — Computational approaches that optimize for memory hierarchy and data movement patterns in modern hardware
- [[attention-mechanism]] — Core component of transformer architectures with O(N²) memory complexity in standard implementations
- [[memory-optimization]] — Techniques for reducing memory usage and improving memory access patterns in deep learning
- [[gpu-memory-hierarchy]] — Multi-level memory system with fast SRAM and slower high bandwidth memory (HBM)
- [[tiling-computation]] — Breaking large computations into smaller blocks that fit in fast memory
- [[sequence-length-scaling]] — Ability to handle longer input sequences efficiently in transformer models

## Related Topics
- [[transformer-architecture]]
- [[attention-optimization]]
- [[gpu-computing]]
- [[memory-efficient-training]]
- [[large-language-models]]
- [[computational-complexity]]
- [[parallel-computing]]