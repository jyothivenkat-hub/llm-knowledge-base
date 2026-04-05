---
title: "Scaling Laws"
related_claims: ["scaling-laws-for-neural-language-models-001", "scaling-laws-for-neural-language-models-006", "scaling-laws-for-neural-language-models-008", "scaling-laws-for-neural-language-models-009", "scaling-laws-for-neural-language-models-010"]
last_updated: "2026-04-04"
source_count: 1
---

## Overview

Scaling laws describe the predictable, power-law relationships between [[Language Model]] performance (measured as loss) and three key dimensions: model size (N), dataset size (D), and compute budget (C). These laws enable researchers to forecast model performance across orders of magnitude without training at target scale, fundamentally shifting deep learning research from expensive architecture search toward understanding and optimizing fundamental scaling relationships.

## Key Findings

### Power Law Relationships

Language model loss follows consistent power law scaling across all three primary dimensions:
- **Model size (N)**: Loss scales as N^-0.076
- **Dataset size (D)**: Loss scales as D^-0.095  
- **Compute budget (C)**: Loss scales as C^-0.050

These exponents reveal that dataset size has the strongest marginal impact on performance, followed by model size, with compute budget showing the weakest scaling coefficient.

### Predictive Power of Small-Scale Experiments

Small-scale model experiments can reliably predict large-scale performance through power law extrapolation. This enables cost-effective performance forecasting and eliminates the need for expensive full-scale training runs during the planning phase, allowing researchers to make principled decisions about resource allocation before committing to large compute budgets.

### The Chinchilla Revision

The original scaling law findings were substantially revised by Chinchilla scaling laws (Hoffmann et al., 2022), which demonstrated that models should be trained on approximately **20x more tokens than parameters**. This finding revealed that many contemporary models were significantly undertrained—prioritizing model size growth over adequate training data exposure. 

This revision catalyzed a paradigm shift in model development: rather than maximizing model size alone, the field moved toward optimizing the compute-token-size tradeoff. Practical implementations of this insight (e.g., [[Chinchilla]], [[LLaMA]]) produced smaller but substantially better-trained models, demonstrating that the Chinchilla approach yields superior performance-per-compute compared to size-maximizing strategies.

### Research Implications

Predictable scaling laws eliminate the need for expensive [[Architecture Search]] and enable principled [[Compute Budget]] planning. This shifts research focus away from empirical hyperparameter optimization toward understanding the fundamental mathematical relationships governing model performance.

## Methods

Scaling laws have been derived through:
- **Systematic experiments** across multiple model sizes (varying N)
- **Dataset size ablations** (varying D)
- **Compute budget sweeps** (varying C)
- **Power law fitting** to empirical loss curves
- **Cross-validation** of predictions against held-out large-scale training runs

The methodology relies on the assumption that power law relationships hold across multiple orders of magnitude, which has been validated empirically but may have domain boundaries at extreme scales.

## Open Questions

- **Boundary conditions**: Do power law exponents remain constant at extreme scales (models with trillions of parameters)?
- **Interaction effects**: How do the three scaling dimensions interact beyond simple multiplicative models?
- **Task generalization**: Do these scaling laws hold uniformly across different downstream tasks, or do exponents vary by task type?
- **Architecture dependence**: How much do scaling exponents depend on specific architectural choices (attention mechanisms, layer configurations, etc.)?
- **Data quality**: How do scaling laws account for dataset quality, diversity, and composition beyond raw token count?

## Sources

- [[Scaling Laws for Neural Language Models]]