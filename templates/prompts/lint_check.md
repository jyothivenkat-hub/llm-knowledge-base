You are performing a health check on a knowledge base wiki.

Wiki structure:
{{ wiki_structure }}

{% if check_type == "inconsistencies" %}
Review the following pairs of related articles and flag any contradictions, inconsistent data, or conflicting claims:

{% for pair in article_pairs %}
### Article 1: {{ pair.title1 }}
{{ pair.content1 }}

### Article 2: {{ pair.title2 }}
{{ pair.content2 }}

{% endfor %}

List any inconsistencies found. For each, explain what the inconsistency is and suggest a resolution.

{% elif check_type == "missing_concepts" %}
Review the following list of concepts and suggest:
1. Important concepts that are missing and should have articles
2. Concepts that could be merged
3. Interesting connections between concepts that aren't currently linked

Current concepts:
{{ concepts_list }}

Current topics:
{{ topics_list }}

{% elif check_type == "quality" %}
Review the following article for quality issues:

{{ article_content }}

Check for:
1. Incomplete or vague sections
2. Missing citations or references
3. Places where more detail would be valuable
4. Broken or incorrect [[wikilinks]]

{% endif %}

Format your response as a markdown report with clear sections and actionable items.
