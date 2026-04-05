---
title: "Transformer"
related_claims: ["attention-is-all-you-need-001", "attention-is-all-you-need-003", "attention-is-all-you-need-004"]
last_updated: "2026-04-04"
source_count: 1
---

## Overview

The Transformer is a neural network architecture that replaces recurrence and convolution entirely with [[attention]] mechanisms as its primary computational primitive. Introduced to address limitations of sequential processing in RNNs, it enables parallel processing of sequences while maintaining the ability to model long-range dependencies. The architecture has become foundational for modern deep learning, particularly in natural language processing.

## Key Findings

### Performance Achievements

The Transformer achieves state-of-the-art results on machine translation benchmarks, scoring 28.4 BLEU on WMT 2014 English-to-German translation—an improvement of over 2 BLEU points above previous best results. This substantial performance gain demonstrates the effectiveness of the attention-based approach over traditional sequence-to-sequence models relying on recurrence.

## Methods

### Multi-Head Attention

[[Multi-head attention]] is a core architectural component that allows the model to simultaneously attend to information from different representation subspaces at different positions. This mechanism enables the Transformer to capture diverse types of relationships and dependencies within sequences in parallel, rather than through sequential processing.

### Positional Encoding

Since the Transformer lacks the inherent sequential processing of RNNs, [[positional encoding]] is necessary to inject sequence order information into the model. This allows the architecture to leverage token order without recurrence, maintaining awareness of position while preserving the parallelizability advantages of the design.

## Open Questions

- How do Transformers scale to extremely long sequences, and what are the fundamental limits of [[attention]] mechanisms for capturing very long-range dependencies?
- What is the theoretical basis for why attention-only architectures are sufficient for sequence modeling?
- How do different positional encoding schemes affect model performance on various tasks?

## Sources

- [[Attention Is All You Need]]