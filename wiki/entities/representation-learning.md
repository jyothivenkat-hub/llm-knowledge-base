---
title: "Representation Learning"
related_claims: ["do-large-language-models-think-like-the-brain-layer-wise-embeddings-and-fmri-001", "do-large-language-models-think-like-the-brain-layer-wise-embeddings-and-fmri-003", "llm-brain-fmri-alignment-003"]
last_updated: "2026-04-05"
source_count: 2
---

## Overview

Representation learning refers to how neural systems—both artificial and biological—encode and progressively abstract information across hierarchical processing layers. In [[Large Language Models]] (LLMs), this encompasses learned embeddings and internal states that transform raw linguistic input into higher-order semantic meaning. Recent neuroscience research has revealed striking parallels between how LLMs organize representations and how the human brain processes language, suggesting convergent solutions to the problem of meaning extraction.

## Key Findings

### Hierarchical Abstraction and Brain Alignment

A robust finding across recent neuroscience studies is that **stronger brain-model correspondence emerges at higher levels of semantic abstraction rather than at surface-level linguistic features**. This pattern holds across both functional (fMRI activity) and anatomical measures, indicating that alignment strengthens as representations become more abstract and semantically rich. Critically, this suggests that both LLMs and human brains employ **shared computational principles for extracting meaning** from language—the alignment is not merely superficial but reflects convergent strategies for semantic processing.

The alignment is not uniform across network depth; rather, it systematically strengthens as one moves from early, surface-oriented layers toward deeper, more abstract representations. This hierarchical correspondence implies that semantic abstraction itself may be a fundamental organizing principle in both artificial and biological language processing systems.

### Intermediate Layers as Functional Analogues

Intermediate layer representations in LLMs occupy a functionally critical position, carrying particularly rich linguistic information that most closely mirrors human sentence-level processing. These mid-layer embeddings show the strongest functional correspondence with neural mechanisms of sentence comprehension in the brain, suggesting they represent an optimal balance point between linguistic structure and semantic content—neither too surface-level nor overly abstracted.

This finding implies that **sentence-level processing is a key computational unit** in both LLMs and human language understanding, and that intermediate layers in LLMs may serve analogous roles to mid-level processing stages in the human language system (potentially involving regions like the superior temporal sulcus or angular gyrus, though this remains to be directly tested).

## Methods

The findings synthesized here derive from **layer-wise analysis of LLM embeddings correlated with human brain imaging data** (fMRI). Researchers have examined how representations at different depths of LLM architectures align with brain activity patterns recorded while humans process language. This approach allows for fine-grained mapping of computational stages in artificial models to putative processing stages in the human brain.

## Open Questions

- **Causal mechanisms**: Do the observed correspondences reflect genuine functional homology, or merely convergent statistical properties? Do LLMs actually implement brain-like computations, or achieve similar outputs through different means?

- **Layer-to-brain mapping specificity**: Which specific brain regions or networks correspond to intermediate vs. deep LLM layers? Is the mapping consistent across individuals and language tasks?

- **Abstraction metrics**: How should "semantic abstraction" be formally defined and measured? Are current measures capturing the relevant dimensions of abstraction?

- **Generalization across architectures**: Do these patterns hold across different LLM architectures, sizes, and training objectives, or are they specific to particular model families?

- **Directionality of insight**: Can understanding LLM representations improve neuroscience models of language, or is the relationship primarily unidirectional?

## Sources

- [[Do Large Language Models Think Like the Brain? Layer-Wise Embeddings and fMRI]]
- [[Llm Brain Fmri Alignment]]