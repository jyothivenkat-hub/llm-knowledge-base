---
title: "Sequence Modeling"
related_claims: ["attention-is-all-you-need-001", "attention-is-all-you-need-002", "transformers-neurons-astrocytes-010"]
last_updated: "2026-04-04"
source_count: 2
---

## Overview

Sequence modeling refers to the computational task of processing and generating sequential data by learning dependencies and patterns across time steps or positions. Historically dependent on [[Recurrent Neural Networks|RNNs]] and [[Convolutional Neural Networks|CNNs]], the field has undergone a fundamental shift toward [[Attention Mechanisms|attention-based]] approaches that can capture long-range dependencies more effectively and with greater parallelizability.

## Key Findings

### Architectural Paradigm Shift

The [[Transformer]] architecture represents a watershed moment in sequence modeling, demonstrating that [[Self-Attention|self-attention]] mechanisms can serve as the *sole* computational primitive for sequence transduction tasks, eliminating the architectural necessity for recurrence or convolution. This finding challenges decades of conventional wisdom about what mechanisms are "essential" for sequential processing.

Empirically, this shift delivers substantial improvements: Transformers achieved state-of-the-art machine translation results on WMT 2014 English-to-German (28.4 BLEU), improving over previous best results by over 2 BLEU points—a significant margin in the field.

### Biological Grounding

Recent work suggests that the global context aggregation achieved by [[Attention Mechanisms|attention]] over entire sequences has a plausible biological correlate: [[Astrocytes]] integrate information across thousands of synapses, providing a mechanism for the kind of distributed, holistic information integration that transformers perform computationally. This connection hints that attention-based sequence modeling may reflect principles of biological neural computation.

## Methods

- **Benchmark evaluation**: Machine translation tasks (WMT 2014) with BLEU score metrics
- **Architectural comparison**: Direct replacement of RNN/CNN components with [[Self-Attention|self-attention]] layers
- **Biological analogy**: Comparative analysis of transformer attention patterns with astrocyte information integration

## Open Questions

- How do attention mechanisms scale to extremely long sequences, and what are the fundamental limits?
- Does the biological analogy to astrocytes suggest novel architectural improvements or training procedures?
- Can [[Self-Attention|self-attention]] be made more sample-efficient, or is the empirical success dependent on large-scale data?
- What inductive biases (if any) do RNNs and CNNs provide that pure attention architectures lack?

## Sources

- [[Attention Is All You Need]]
- [[Transformers Neurons Astrocytes]]