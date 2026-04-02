You are writing a high-level summary for a knowledge base wiki.

The wiki contains the following topics and concepts:

{% for topic_name, topic_data in topics.items() %}
## {{ topic_data.title }}
{{ topic_data.description }}
Concepts: {{ topic_data.concepts | join(', ') }}
{% endfor %}

Total sources: {{ total_sources }}
Total concepts: {{ total_concepts }}
Total wiki articles: {{ total_articles }}

Write a concise overview of the entire knowledge base (300-500 words) that:
1. Describes the main themes and areas covered
2. Highlights key connections between topics
3. Notes the most important concepts
4. Uses [[wikilinks]] to reference topics and concepts

Output just the markdown content (no front matter needed).
