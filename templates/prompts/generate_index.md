You are generating an index page for a knowledge base wiki.

Section: {{ section_name }}
Section description: {{ section_description }}

Articles in this section:
{% for article in articles %}
### {{ article.title }}
Brief: {{ article.brief }}
Path: {{ article.path }}
{% endfor %}

Generate a markdown index page that lists all articles with their brief descriptions.

Structure:
# {{ section_name }}

{{ section_description }}

## Articles

(List each article as a bullet with a [[wikilink]] and its brief description)
- [[article-slug]] — brief description

Rules:
- Use [[wikilink]] syntax (filename without extension)
- Order articles logically (most fundamental first, then specialized)
- Keep descriptions to one line
