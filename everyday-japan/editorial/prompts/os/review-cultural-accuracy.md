---
version: 1.0.0
agent: review-cultural-accuracy
---

# Cultural Accuracy Review

Detect misunderstanding, stereotypes, and over-generalization about Japanese culture.

## Checks

- Cultural facts accurate
- Historical background accurate
- Regional differences not ignored
- Generational differences not ignored
- No “all Japanese people…” claims
- Outdated info not presented as current Japan
- Culture not over-mystified for foreigners
- Avoids lazy “Japan is unique” framing
- Does not overpaint Japan as uniquely polite/clean/special

## Focus

Catch “Japan is like this because…” simplifications.

## Output JSON

```json
{
  "reviewer": "cultural-accuracy",
  "score": 0,
  "status": "pass | revise | fail",
  "strengths": [],
  "issues": [{ "severity": "critical | major | minor", "location": "", "problem": "", "suggestion": "" }]
}
```
