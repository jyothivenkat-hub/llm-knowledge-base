---
title: "Transformers"
related_claims: ["google-brain-llm-language-processing-003", "google-brain-llm-language-processing-005", "llm-explanations-brain-representations-008", "neuroscience-of-transformers-001", "neuroscience-of-transformers-002", "neuroscience-of-transformers-003", "neuroscience-of-transformers-004", "neuroscience-of-transformers-006", "neuroscience-of-transformers-007", "neuroscience-of-transformers-009", "neuroscience-of-transformers-010", "scaling-laws-for-neural-language-models-004", "scaling-laws-for-neural-language-models-005"]
last_updated: "2026-04-05"
source_count: 3
---

## Overview

Transformers are a neural network architecture based on attention mechanisms that have become foundational to modern deep learning, particularly for [[language models]]. Research reveals two complementary but distinct perspectives: from a machine learning standpoint, transformer performance is primarily determined by [[scaling laws]] rather than architectural details, while from a neuroscience perspective, transformer components exhibit striking computational homologies with biological cortical circuits. This suggests transformers may instantiate fundamental principles of neural computation that appear across both artificial and biological systems—though the mechanisms differ substantially (parallel discrete computation vs. serial continuous processing).

## Key Findings

### Scaling Dominates Architecture

The primary determinant of transformer performance is **scale**—specifically model width and depth—rather than specific architectural hyperparameters like attention head count or feed-forward layer dimensions when total parameters are held constant. This finding substantially reduces the importance of architecture search compared to previous assumptions. Once a viable transformer design is established, engineering effort should focus on scaling rather than architectural optimization.

### Convergence on Fundamental Computational Principles

Despite fundamental architectural differences, transformers and biological brains appear to converge on similar core mechanisms for [[language understanding]]:

- **Next-word prediction as a fundamental principle**: Both human brains and [[LLMs]] implement next-word prediction and [[prediction error]] (surprise) signals as core computational mechanisms. This suggests prediction-based processing is a fundamental principle of language understanding rather than an artifact of transformer architecture.

- **Representational alignment independent of processing speed**: [[LLM embeddings]] show striking alignment with brain activity patterns even though brains process language serially and temporally while transformers process thousands of words simultaneously. This suggests representational alignment is independent of processing speed and parallelism, pointing to shared organizational principles rather than shared implementation details.

- **Hierarchical layer structure**: The alignment between transformer layer structure and brain processing hierarchies suggests that transformer-based language models may have converged on organizational principles similar to those evolved in human neural language systems.

### Computational Homology with Cortical Circuits

Transformer components map onto biological neural structures in functionally meaningful ways:

- **Attention mechanisms and contextual selection**: Transformer attention mechanisms serve as computational analogies for contextual selection and content routing in cortical circuits, particularly in [[cortical column]] organization. This mapping should be understood as functional homology rather than literal brain implementation.

- **Feed-forward layers and dendritic integration**: Feed-forward layers in transformers correspond functionally to dendritic integration processes in cortical microcircuits, suggesting a shared computational principle between artificial and biological neural systems for integrating information across multiple inputs.

## Methods

Research synthesizing transformers with neuroscience has employed:
- **Representational alignment analysis**: Comparing [[LLM embeddings]] and activation patterns with neural recordings from language-processing brain regions
- **Computational modeling**: Mapping transformer architectural components to cortical circuit motifs and analyzing functional equivalence
- **Behavioral prediction**: Testing whether transformer-derived representations predict human language processing patterns

## Open Questions

1. **Mechanism of alignment**: Why do transformers and brains converge on similar representations despite radically different hardware constraints and learning mechanisms? Is this convergent evolution toward optimal solutions, or do both systems exploit fundamental principles of information processing?

2. **Generalization of prediction principle**: Is next-word prediction the fundamental organizing principle for all language understanding, or is it one of multiple valid approaches? Do biological brains truly implement prediction error signals in the same way transformers do?

3. **Biological plausibility of attention**: How could transformer-style attention mechanisms—which require all-to-all connectivity and synchronized computation—be implemented in biological neural tissue with local connectivity constraints?

4. **Scaling laws in biology**: Do biological neural systems follow similar scaling laws to transformers? If so, what are the constraints on brain size and computational capacity?

5. **Functional vs. literal homology**: Are the mappings between transformer components and cortical circuits functionally equivalent or merely analogous? What would constitute evidence of true computational equivalence?

## Sources

- [[Google Brain Llm Language Processing]]
- [[Llm Explanations Brain Representations]]
- [[Neuroscience Of Transformers]]
- [[Scaling Laws For Neural Language Models]]