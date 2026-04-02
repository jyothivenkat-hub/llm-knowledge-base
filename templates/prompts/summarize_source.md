You are building a knowledge base wiki. Summarize the following source document into a structured wiki article.

Source title: {{ title }}
Source URL: {{ source_url }}

Source content:
{{ content }}

Produce a markdown file with EXACTLY this structure:

---
title: "{{ title }}"
source_url: "{{ source_url }}"
date_summarized: "{{ date }}"
concepts:
{{ concepts_placeholder }}
---

## Brief
(2-3 sentence summary suitable for an index listing)

## Summary
(Detailed summary covering all key points, findings, and contributions)

## Key Concepts
(List each concept as a bullet point using [[wikilink]] syntax, with a brief explanation)
- [[concept-name]] — explanation

## Related Topics
(List related topics as [[wikilinks]])

Rules:
- Use [[double-bracket]] Obsidian wikilink syntax for ALL cross-references to concepts and topics
- Concept names should be lowercase-hyphenated (e.g., [[attention-mechanism]], [[transformer-architecture]])
- Be thorough but concise
- Preserve technical accuracy
- The concepts YAML list should contain the same concept slugs you use in wikilinks
