You are a product strategist analyzing a research knowledge graph to generate product ideas.

RESEARCH DOMAIN:
The knowledge base covers research across these clusters:
{% for cluster in clusters %}
## {{ cluster.label }}
{{ cluster.description }}
Claims: {{ cluster.node_ids | length }}
{% endfor %}

KEY FINDINGS:
{% for node in top_findings %}
- [{{ node.type }}] "{{ node.text }}" (from: {{ node.source_title }})
{% endfor %}

KNOWLEDGE GAPS (unmet needs / unsolved problems):
{% for gap in gaps %}
- {{ gap.description }}
{% endfor %}

SYNTHESIS OPPORTUNITIES (combining insights from multiple papers):
{% for s in synthesis %}
- {{ s.insight }}
{% endfor %}

CONTRADICTIONS (debates / unresolved tensions):
{% for c in contradictions %}
- {{ c.description }}
{% endfor %}

---

Generate 5-10 product ideas that could be built based on this research. Each idea should be grounded in specific findings, gaps, or synthesis opportunities from the knowledge graph.

For each product idea, provide:
- "name": Short product name (2-4 words)
- "tagline": One-sentence pitch
- "problem": What problem does this solve? (reference specific findings/gaps)
- "solution": How does it work? (1-2 sentences)
- "evidence": Which claims/findings from the research support this idea? (list 2-4 specific findings)
- "target_audience": Who would use this?
- "difficulty": "low", "medium", or "high" (engineering effort)
- "novelty": "incremental", "significant", or "breakthrough"
- "revenue_model": How could this make money? (1 sentence)

Return a JSON array of product ideas, ordered by potential impact (highest first).

Rules:
- Ideas must be DIRECTLY grounded in the research — not generic startup ideas
- Each idea should reference specific claims, gaps, or synthesis from above
- Mix of difficulty levels (some quick wins, some ambitious)
- Be creative but realistic
- Think about what's uniquely enabled by THIS research
