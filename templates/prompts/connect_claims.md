You are finding relationships between research claims for a knowledge graph.

Here are claims from multiple papers. Find ALL meaningful connections between them, especially CROSS-PAPER connections.

Claims:
{% for claim in claims %}
[{{ claim.id }}] ({{ claim.type }}, from: {{ claim.source_paper }})
"{{ claim.text }}"
Tags: {{ claim.tags | join(', ') }}
{% endfor %}

For each relationship found, return:
- "source_id": ID of the first claim
- "target_id": ID of the second claim
- "relationship": one of "supports", "contradicts", "extends", "causes", "is-part-of", "related-to", "provides-mechanism-for", "uses-method"
- "strength": 0.0 to 1.0 (how strong is this connection?)
- "explanation": one sentence explaining WHY these are connected

Return a JSON array of relationships.

Rules:
- Prioritize CROSS-PAPER connections over same-paper connections
- "supports": claim A provides evidence for claim B
- "contradicts": claims disagree or present conflicting evidence
- "extends": claim A builds on or refines claim B
- "causes": claim A leads to or enables claim B
- "provides-mechanism-for": claim A explains HOW claim B works
- "related-to": weaker thematic connection
- Strength 0.8-1.0: direct, strong connection. 0.5-0.8: moderate. 0.2-0.5: weak but meaningful.
- Only include connections with strength >= 0.3
- Be thorough — find ALL meaningful connections, not just obvious ones

Example:
[
  {
    "source_id": "paper-a-003",
    "target_id": "paper-b-007",
    "relationship": "contradicts",
    "strength": 0.75,
    "explanation": "Paper A claims larger models are always better, but Paper B shows diminishing returns past 70B parameters"
  }
]
