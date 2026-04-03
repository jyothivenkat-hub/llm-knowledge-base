---
title: "Do Large Language Models Think Like the Brain? Layer-Wise Embeddings and fMRI"
url: "https://arxiv.org/abs/2505.22563"
---

# Do Large Language Models Think Like the Brain?

**Authors:** Yu Lei, Xingyang Ge, Yi Zhang, Yiming Yang, Bolei Ma
**Published:** AAAI 2026

## Abstract

This paper investigates whether layer-wise representations in LLMs align with dynamic neural responses during human sentence comprehension. The researchers compared embeddings from 14 publicly available language models against fMRI data from participants listening to a narrative story to determine which model layers correspond most closely to brain activations.

## Key Findings

### Intermediate Layers Match the Brain Best
Middle layers of LLMs show higher brain-model correlation than final layers, particularly across language-selective brain regions like the inferior frontal gyrus (IFG) and posterior temporal cortex. These intermediate representations carry rich linguistic information that most closely mirrors human sentence-level processing.

### Performance Drives Brain-Like Architecture
Enhanced model performance correlates with representational structures that increasingly resemble brain-like hierarchies. As LLMs get better at language tasks, their internal representations naturally evolve toward brain-like processing patterns.

### Semantic Abstraction Alignment
The strongest correspondence between models and brain activity occurs at higher levels of semantic abstraction — stronger functional and anatomical correspondence at higher semantic abstraction levels.

### Instruction Tuning Helps
Instruction-tuned models consistently outperformed their base versions in both sentence comprehension and neural alignment, with statistically significant improvements.

### Hemispheric Engagement
LLM processing engages both conserved left-hemispheric language systems and right-hemispheric networks supporting higher-order cognitive demands.

## Methodology

- Compared 14 LLMs (various sizes and architectures)
- Used fMRI data from participants exposed to naturalistic narrative
- Constructed sentence-level neural prediction models
- Identified model layers most correlated with brain region activations

## Implications

LLMs function as viable computational models for understanding human language processing. The finding that intermediate layers best predict brain activity suggests that the final output layers of LLMs may over-optimize for task performance at the expense of brain-like representations.
