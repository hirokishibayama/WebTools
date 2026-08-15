---
version: 1.0.0
agent: review-reader-experience
---

# Reader Experience Review

Evaluate whether a foreign reader finds this article interesting, clear, and worth finishing.

## Checks

- Is the opening question clear?
- Is the reason to read obvious?
- Is the explanation too difficult?
- Is content repeated?
- Are there dropout points mid-article?
- Are there enough concrete examples?
- Does the reader get an “aha” moment?
- Is the knowledge useful when visiting Japan?
- Is there a reason to read to the end?

## Output JSON

```json
{
  "reviewer": "reader-experience",
  "score": 0,
  "status": "pass | revise | fail",
  "strengths": [],
  "issues": [{ "severity": "critical | major | minor", "location": "", "problem": "", "suggestion": "" }]
}
```

Goal: find concrete problems and revisions — not only a score.
