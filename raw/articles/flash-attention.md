---
title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
url: "https://arxiv.org/abs/2205.14135"
---

# FlashAttention

FlashAttention is an IO-aware exact attention algorithm that uses tiling to reduce the number of memory reads/writes between GPU high bandwidth memory (HBM) and GPU on-chip SRAM. It achieves 2-4x wall-clock speedup over optimized baselines and enables longer sequences.

## Key Ideas

- Standard attention has O(N^2) memory complexity due to materializing the attention matrix
- FlashAttention computes attention without materializing the full N x N matrix
- Uses tiling to break computation into blocks that fit in SRAM
- Recomputes attention during backward pass instead of storing it (trading compute for memory)

## IO-Awareness

The key insight is that modern GPUs have a memory hierarchy:
- SRAM: fast but small (~20MB on A100)
- HBM: large but slow (40-80GB on A100)

Standard attention does many HBM reads/writes. FlashAttention minimizes these by:
1. Loading blocks of Q, K, V from HBM to SRAM
2. Computing attention output for that block in SRAM
3. Writing only the final output back to HBM

## Results

- 2-4x faster than PyTorch standard attention
- Reduces memory from O(N^2) to O(N)
- Enables training with much longer sequences (up to 16K)
- Used in many production LLMs including GPT-4

## FlashAttention-2

An improved version that:
- Better parallelizes across the sequence length dimension
- Reduces non-matmul FLOPs
- Achieves up to 2x speedup over FlashAttention
- Reaches 50-73% of theoretical peak FLOPS on A100
