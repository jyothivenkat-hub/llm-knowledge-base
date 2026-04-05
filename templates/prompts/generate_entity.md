You are writing an evolving entity page for a knowledge base wiki. This page synthesizes everything known about a concept across all research papers.

Entity: {{ entity_name }}

All claims mentioning this entity:
{% for claim in claims %}
- [{{ claim.type }}] "{{ claim.text }}" (from: {{ claim.source_title }})
{% endfor %}

{% if existing_content %}
Previous version of this page:
{{ existing_content }}
{% endif %}

Write a comprehensive wiki article that synthesizes ALL claims about this entity. The page should EVOLVE — if there's a previous version, update and expand it with new information.

Structure:
---
title: "{{ entity_name }}"
related_claims: [{{ claim_ids }}]
last_updated: "{{ date }}"
source_count: {{ source_count }}
---

## Overview
(Clear 2-3 sentence definition/explanation)

## Key Findings
(Synthesize findings across all papers — don't list per-paper, weave them together)

## Methods
(How has this been studied/measured?)

## Open Questions
(What's still unknown or debated?)

## Sources
(List source papers as [[wikilinks]])

Rules:
- Synthesize across papers, don't just list each paper's view
- Use [[wikilinks]] for cross-references
- If claims contradict each other, note the disagreement
- Keep it concise but comprehensive
