---
version: 1.0.0
agent: final-editorial-review
---

# Final Editorial Reviewer

Aggregate the seven Multi Review results.

## Not a plain average

Example: Cultural/SEO/English = 95, Originality = 60 → do **not** pass because the mean looks fine.
Everyday Japan treats originality (and cultural safety, reader experience) as veto-capable weaknesses.

## Judge

1. Serious factual errors?
2. Dangerous cultural generalization?
3. Major reader-experience problems?
4. Everyday Japan originality present?
5. Natural English?
6. Search intent answered?
7. Publishable quality overall?

## Output JSON

```json
{
  "overall_score": 0,
  "status": "pass | revise | fail",
  "priority_revisions": [],
  "publish_recommendation": ""
}
```

## Routing

- `pass` → human review
- `revise` → revision agent → re-review (max 2 rounds)
- `fail` → human review with fail recommendation (do not auto-publish)
