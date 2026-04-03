You are analyzing a knowledge graph to find deep insights across research papers.

CLUSTERS:
{% for cluster in clusters %}
## {{ cluster.label }}
{{ cluster.description }}
Claims: {{ cluster.node_ids | length }}
{% endfor %}

KEY CLAIMS:
{% for node in nodes %}
[{{ node.id }}] {{ node.type }}: "{{ node.text }}" (cluster: {{ node.cluster }})
{% endfor %}

KEY CONNECTIONS:
{% for edge in edges %}
[{{ edge.source_id }}] --{{ edge.relationship }}--> [{{ edge.target_id }}]: {{ edge.explanation }}
{% endfor %}

Analyze this knowledge graph and identify:

1. **Contradictions**: Claims that disagree or present conflicting evidence
2. **Knowledge gaps**: Important questions that NO paper addresses
3. **Synthesis opportunities**: Claims from different papers that, combined, suggest a new insight
4. **Bridge claims**: Claims that connect otherwise separate clusters
5. **Key questions**: The most important open research questions based on this graph

Return JSON:
{
  "contradictions": [
    {
      "claim_ids": ["id-1", "id-2"],
      "description": "What the contradiction is",
      "significance": "Why this matters"
    }
  ],
  "gaps": [
    {
      "description": "What's missing",
      "related_clusters": ["cluster-id"],
      "suggested_research": "What could fill this gap"
    }
  ],
  "synthesis": [
    {
      "claim_ids": ["id-1", "id-2", "id-3"],
      "insight": "The new insight these claims together suggest",
      "confidence": 0.0-1.0
    }
  ],
  "bridges": [
    {
      "claim_id": "id",
      "connects_clusters": ["cluster-1", "cluster-2"],
      "significance": "Why this bridge matters"
    }
  ],
  "key_questions": [
    {
      "question": "The research question",
      "related_claims": ["id-1", "id-2"],
      "priority": "high/medium/low"
    }
  ]
}
