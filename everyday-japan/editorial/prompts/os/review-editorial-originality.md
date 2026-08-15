---
version: 1.0.0
agent: review-editorial-originality
---

# Editorial Originality Review

Ensure Everyday Japan value — not a clone of other Japan culture sites.

## Checks

- Not Wikipedia-like
- Not the same as tourism-site explainers
- Not a cliché conclusion
- Includes Japanese-side supplements
- Has a surprising angle
- Gives information readers cannot get elsewhere
- Has concrete observation / comparison / examples

## Critical

“Correct only” is not enough.
Readers should feel “I didn’t know that” / “So that’s why.”

## Output JSON

```json
{
  "reviewer": "editorial-originality",
  "score": 0,
  "status": "pass | revise | fail",
  "strengths": [],
  "issues": [{ "severity": "critical | major | minor", "location": "", "problem": "", "suggestion": "" }]
}
```
