---
title: "Scaling Laws for Neural Language Models"
url: "https://arxiv.org/abs/2001.08361"
---

# Scaling Laws for Neural Language Models

This paper by Kaplan et al. (2020) establishes empirical scaling laws that describe how language model performance scales with model size, dataset size, and compute budget.

## Key Findings

### Power Law Relationships
- Loss scales as a power law with model parameters (N), dataset size (D), and compute (C)
- L(N) ~ N^(-0.076) for model size
- L(D) ~ D^(-0.095) for dataset size
- L(C) ~ C^(-0.050) for compute budget

### Optimal Allocation
- Given a fixed compute budget, there is an optimal model size and number of training tokens
- Larger models are more sample-efficient (achieve better loss per token seen)
- It's better to train a larger model on less data than a smaller model on more data (later revised by Chinchilla)

## Impact on Transformer Architecture

- Performance depends strongly on model size (width and depth), not on specific architectural details
- Increasing the number of attention heads or feed-forward dimensions while keeping total parameters fixed has little effect
- The Transformer architecture itself is not the bottleneck — scale is

## Connection to Chinchilla Scaling Laws

The Chinchilla paper (Hoffmann et al., 2022) revised these findings:
- Showed that models should be trained on roughly 20x more tokens than parameters
- Many existing models were significantly undertrained
- Led to training smaller but better-trained models (Chinchilla, LLaMA)

## Implications for Practice

- Predictable scaling enables planning compute budgets
- Small model experiments can predict large model performance
- Architecture search is less important than scale
- The loss-compute frontier defines the Pareto-optimal allocation
