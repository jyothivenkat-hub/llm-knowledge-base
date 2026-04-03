---
title: "Scaling Laws for Neural Language Models"
source_url: "https://arxiv.org/abs/2001.08361"
date_summarized: "2026-04-02"
concepts:
  - power-law-scaling
  - compute-optimal-training
  - transformer-architecture
  - language-model-performance
  - parameter-scaling
  - dataset-scaling
  - chinchilla-scaling-laws
  - sample-efficiency
---

## Brief
Kaplan et al. (2020) established empirical power laws describing how neural language model performance scales with model size, dataset size, and compute budget, showing predictable relationships that enable optimal resource allocation for training.

## Summary
This foundational paper by Kaplan et al. demonstrates that neural language model performance follows predictable power law relationships across three key dimensions: model parameters, dataset size, and compute budget. The research found that loss scales as L(N) ~ N^(-0.076) for model parameters, L(D) ~ D^(-0.095) for dataset size, and L(C) ~ C^(-0.050) for compute budget.

A critical finding was that given a fixed compute budget, there exists an optimal allocation between model size and training data, with larger models being more sample-efficient than smaller ones. The paper initially suggested training larger models on less data rather than smaller models on more data, though this was later revised by the [[chinchilla-scaling-laws]].

The research revealed that performance depends primarily on scale rather than architectural details - increasing attention heads or feed-forward dimensions while keeping total parameters constant had minimal impact. This suggested that the [[transformer-architecture]] itself was not the limiting factor, but rather the scale of the model.

The work's implications were significant for the field, enabling predictable planning of compute budgets and demonstrating that small-scale experiments could reliably predict large-scale performance. However, the [[chinchilla-scaling-laws]] later showed that models should be trained on approximately 20x more tokens than parameters, revealing that many existing models were undertrained and leading to more efficient training approaches.

## Key Concepts
- [[power-law-scaling]] — Mathematical relationship where loss decreases predictably with increases in model size, data, or compute
- [[compute-optimal-training]] — Strategy for allocating fixed computational resources optimally between model size and training duration
- [[transformer-architecture]] — The underlying neural network architecture whose performance was shown to depend more on scale than specific design choices
- [[language-model-performance]] — Measured primarily through loss metrics that follow predictable scaling relationships
- [[parameter-scaling]] — How model performance improves with increasing number of parameters following L(N) ~ N^(-0.076)
- [[dataset-scaling]] — How performance improves with larger training datasets following L(D) ~ D^(-0.095)
- [[chinchilla-scaling-laws]] — Revised scaling laws showing models should be trained on ~20x more tokens than parameters
- [[sample-efficiency]] — Property where larger models achieve better performance per training token seen

## Related Topics
- [[neural-language-models]]
- [[gpt-models]]
- [[training-efficiency]]
- [[computational-resources]]
- [[model-architecture-design]]
- [[empirical-scaling]]
- [[loss-functions]]
- [[training-dynamics]]