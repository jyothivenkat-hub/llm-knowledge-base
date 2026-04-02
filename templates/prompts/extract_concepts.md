You are organizing a knowledge base wiki. Given the following list of concepts extracted from source summaries, group them into high-level topics and identify the most important concepts that deserve their own wiki articles.

All concepts found across sources:
{{ concepts_list }}

Source summaries for context:
{{ summaries_context }}

Produce a JSON response with this exact structure:
{
  "topics": {
    "topic-slug": {
      "title": "Human Readable Topic Title",
      "description": "One-line description of this topic area",
      "concepts": ["concept-slug-1", "concept-slug-2"]
    }
  },
  "concepts_to_generate": [
    {
      "slug": "concept-slug",
      "title": "Human Readable Title",
      "topic": "topic-slug",
      "sources": ["source-file-1.md", "source-file-2.md"],
      "brief": "One-line description for the concept"
    }
  ]
}

Rules:
- Create 3-10 high-level topics that cover all concepts
- Topic slugs should be lowercase-hyphenated
- Only include concepts that appear in 2+ sources OR are central enough to warrant an article
- Each concept must be assigned to exactly one topic
- Use the concept slugs exactly as they appear in the input
