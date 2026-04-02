You are writing a concept article for a knowledge base wiki.

Concept: {{ concept_title }} ({{ concept_slug }})
Topic area: {{ topic_title }}

The following source summaries mention this concept:
{% for source in sources %}
### From: {{ source.title }}
{{ source.content }}
{% endfor %}

Write a comprehensive wiki article about this concept that synthesizes information from all the sources above.

Produce markdown with this structure:

---
title: "{{ concept_title }}"
topic: "{{ topic_slug }}"
sources:
{% for source in sources %}
  - "{{ source.path }}"
{% endfor %}
---

## Overview
(Clear definition and explanation of the concept)

## Details
(Detailed explanation synthesizing information from all sources)

## Connections
(How this concept relates to other concepts — use [[wikilinks]])

## Sources
(List the source documents as [[wikilinks]])

Rules:
- Use [[wikilink]] syntax for all cross-references
- Concept wikilinks should use lowercase-hyphenated slugs
- Synthesize across sources — don't just list each source's view separately
- Be technical and accurate
- Link to related concepts that might exist in the wiki
