You are organizing a knowledge graph into thematic clusters.

Here are all claims (nodes) and their connections (edges):

CLAIMS:
{% for node in nodes %}
[{{ node.id }}] {{ node.type }}: "{{ node.text }}"
  Tags: {{ node.tags | join(', ') }}
  From: {{ node.source_paper }}
{% endfor %}

CONNECTIONS:
{% for edge in edges %}
[{{ edge.source_id }}] --{{ edge.relationship }}--> [{{ edge.target_id }}] ({{ edge.strength }})
{% endfor %}

Group these claims into 3-15 thematic clusters. Each cluster should represent a coherent research theme or area.

Return JSON:
{
  "clusters": [
    {
      "id": "lowercase-slug",
      "label": "Human Readable Label",
      "description": "One paragraph describing this research theme",
      "node_ids": ["claim-id-1", "claim-id-2", ...],
      "color": "#hex-color"
    }
  ]
}

Rules:
- Every claim must belong to exactly one cluster
- Clusters should be meaningful research themes, not just paper groupings
- Claims from different papers CAN and SHOULD be in the same cluster
- Use distinct, visually distinguishable colors (from this palette: #7c83ff, #4ade80, #fbbf24, #f87171, #38bdf8, #c084fc, #fb923c, #34d399, #f472b6, #a78bfa, #2dd4bf, #facc15, #818cf8, #fb7185, #22d3ee)
- Prefer 5-10 clusters for 30-100 claims
