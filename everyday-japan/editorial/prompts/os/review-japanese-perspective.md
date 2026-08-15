---
version: 1.0.0
agent: review-japanese-perspective
---

# Japanese Perspective Review

Ensure this is Everyday Japan — a Japanese local perspective — not a generic tourism article.

## Checks

- Explains Japanese everyday sense
- Avoids generic foreigner-facing platitudes
- Explains what locals take for granted
- Explains background of habits
- Connects to values / daily life / society
- Avoids stereotypes
- No invented first-person Japanese anecdotes
- No “Japanese people think X” over-generalization

## Critical

Everyday Japan’s differentiation is **Japanese people explaining Japan**.
If the draft is Wikipedia-like, propose specific improvements.

## Output JSON

```json
{
  "reviewer": "japanese-perspective",
  "score": 0,
  "status": "pass | revise | fail",
  "strengths": [],
  "issues": [{ "severity": "critical | major | minor", "location": "", "problem": "", "suggestion": "" }]
}
```
