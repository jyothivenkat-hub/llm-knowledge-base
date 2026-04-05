---
title: "Transformers"
related_claims: ["scaling-laws-for-neural-language-models-004", "scaling-laws-for-neural-language-models-005", "neuroscience-of-transformers-001", "neuroscience-of-transformers-002", "neuroscience-of-transformers-003", "neuroscience-of-transformers-004", "neuroscience-of-transformers-006", "neuroscience-of-transformers-007", "neuroscience-of-transformers-009", "neuroscience-of-transformers-010"]
last_updated: "2026-04-04"
source_count: 2
---

## Overview

Transformers are a neural network architecture based on attention mechanisms that have become foundational to modern deep learning. Research reveals two complementary perspectives: from a machine learning standpoint, transformer performance is primarily determined by [[scaling laws]] rather than architectural details, while from a neuroscience perspective, transformer components exhibit computational homologies with biological cortical circuits. This suggests transformers may instantiate fundamental principles of neural computation that appear across both artificial and biological systems.

## Key Findings

### Scaling Dominates Architecture

The primary determinant of transformer performance is **scale** — specifically model width and depth — rather than specific architectural hyperparameters like attention head count or feed-forward layer dimensions when total parameters are held constant. This finding has a critical implication: the transformer architecture itself is not a performance bottleneck. Instead, scaling is the dominant factor in performance gains, which substantially reduces the importance of architecture search compared to previous assumptions. This suggests that once a viable transformer design is established, engineering effort should focus on scaling rather than architectural optimization.

### Computational Homology with Cortical Circuits

Transformer components map onto cortical organization at the level of computational function rather than biological implementation:

- **Attention mechanisms** correspond to contextual selection and content routing processes in cortical circuits, providing a framework for understanding how context modulates neural responses
- **Feed-forward layers** exhibit computational homology with dendritic integration in cortical microcircuits, suggesting similar principles govern information processing in both systems
- **Residual connections** map to effective connectivity patterns within cortical layers, illuminating how information flows through hierarchical biological circuits
- **Layer normalization** may parallel oscillatory coordination patterns in cortical circuits, suggesting normalization serves a similar stabilizing role to rhythmic synchronization in biological neural systems
- **Laminar structure** of cortical columns appears to instantiate a transformer-like computational motif, with vertical organization implementing attention-like mechanisms for contextual modulation

This computational alignment suggests that transformers may embody fundamental organizational principles of neural computation that transcend the artificial-biological distinction.

## Methods

The transformer-to-cortex mapping generates **testable predictions** about specific biological processes:
- Dendritic integration mechanisms and their relationship to feed-forward computation
- Oscillatory coordination patterns and their role in normalization-like functions
- Laminar specialization and its correspondence to attention-based contextual modulation

These predictions can be empirically validated through neuroscience experiments, creating a bidirectional research framework where insights from one domain inform investigation in the other.

## Open Questions

### The Discrete-Continuous Divide

A **fundamental tension** exists between transformers' requirement for discrete causal sequences and the brain's continuous recurrent dynamics. This represents a key challenge in mapping artificial to biological neural computation. It remains unclear whether this difference reflects:
- A genuine computational divergence between optimal artificial and biological solutions
- An incomplete understanding of how biological systems implement discrete-like operations within continuous dynamics
- A limitation of current transformer architectures that biological systems have overcome

### Scope and Limits of Homology

While computational homologies between transformers and cortex are evident, the extent to which this mapping extends to other brain regions, learning mechanisms, and behavioral functions remains open. The comparison is most productive at the level of computational organization rather than implementation details, but the boundaries of this analogy require further investigation.

## Sources

- [[Scaling Laws for Neural Language Models]]
- [[Neuroscience Of Transformers]]