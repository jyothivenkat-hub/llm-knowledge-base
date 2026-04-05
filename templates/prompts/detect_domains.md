You are organizing a knowledge graph into high-level research domains (like Wikipedia portals).

Below are the thematic clusters that have already been identified. Group them into 3-6 broad domains.

CLUSTERS (use the ID field in your cluster_ids arrays, NOT the label):
{% for cluster in clusters %}
- ID: `{{ cluster.id }}` | Label: **{{ cluster.label }}** ({{ cluster.node_ids | length }} claims): {{ cluster.description }}
{% endfor %}

TOP FINDINGS (use ONLY these to write "did_you_know" facts. Do not invent facts.):
{% for node in top_findings %}
- [{{ node.type }}] "{{ node.text }}" (from: {{ node.source_title }})
{% endfor %}

For each domain, provide:
- "id": lowercase-slug
- "label": Short human-readable name (2-4 words)
- "description": One sentence describing this research area
- "icon": Leave as empty string ""
- "cluster_ids": Array of cluster IDs that belong to this domain
- "featured_finding": Copy the exact text of the most interesting finding from the TOP FINDINGS above. Do not rewrite it.
- "did_you_know": Array of 1-2 facts rewritten from TOP FINDINGS above. Rules:

  ACCURACY (most important):
  - Each fact MUST come from a specific finding listed above. Do not make up connections.
  - Keep the real numbers from the finding (2-4x, 55%, 1 hour, etc.)
  - Do not say two things work "the same way" unless the research actually says that.
  - Do not draw analogies between domains unless a finding explicitly connects them.

  LANGUAGE:
  - Max 15 words. One simple sentence.
  - Write for an 8 year old. Simple words only.
  - Never use em dashes, dashes, or quotes.
  - Never use: computational, hierarchical, representations, convergence, optimization, alignment, architecture, mechanisms, modulation, correspondence.
  - Good: "A coffee at 2pm can still steal one hour of deep sleep that night."
  - Good: "Two hours of phone time before bed cuts your sleep chemical in half."
  - Good: "The middle layers of AI match your brain activity when you read."
  - Bad: "Large language models develop brain-like hierarchical representations through scaling."
  - Bad: "AI and brains use the same mechanisms for language processing."

Also provide a top-level "bridge_facts" array: 2-3 connections across different domains.

  ACCURACY FOR BRIDGE FACTS:
  - Each bridge fact MUST connect two specific findings from DIFFERENT clusters listed above.
  - State what each finding says, then note they connect. Do not invent the connection.
  - If you cannot find a real cross-domain connection backed by findings, return fewer bridge facts.

  LANGUAGE FOR BRIDGE FACTS:
  - Same rules as did_you_know. Max 15 words. Simple. No dashes or quotes.

Return JSON:
{
  "domains": [
    {
      "id": "domain-slug",
      "label": "Domain Name",
      "description": "One sentence.",
      "icon": "",
      "cluster_ids": ["cluster-slug-id-1", "cluster-slug-id-2"],
      "featured_finding": "Exact text copied from a finding above.",
      "did_you_know": ["Simple fact 1", "Simple fact 2"]
    }
  ],
  "bridge_facts": [
    "Cross-domain connection backed by real findings"
  ]
}

Rules:
- Every cluster must belong to exactly one domain
- 3-6 domains (prefer fewer, broader domains)
- Domain labels should be simple, no jargon
- ACCURACY IS MORE IMPORTANT THAN BEING INTERESTING. A boring true fact beats a fascinating made-up one.
- If you cannot verify a fact from the findings above, do not include it
- Featured finding: copy the exact text, do not rewrite
