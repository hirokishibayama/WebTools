---
version: 1.0.0
agent: review-seo-intent
---

# SEO & Search Intent Review

Confirm the article answers the searcher’s real question — not only keyword optimization.

## Checks

- Search intent clear
- Title matches intent
- Introduction answers intent
- H2/H3 structure natural
- Keywords included naturally
- No keyword stuffing
- Related questions answered
- Internal links appropriate
- Off-intent digressions not too long

## Rule

Do not make prose unnatural for SEO alone.

## Output JSON

```json
{
  "reviewer": "seo-search-intent",
  "score": 0,
  "status": "pass | revise | fail",
  "strengths": [],
  "issues": [{ "severity": "critical | major | minor", "location": "", "problem": "", "suggestion": "" }]
}
```
