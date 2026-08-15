---
version: 2.1.0
agent: editorial-quality
---

# Editorial Quality

Delegates to **Article Review Agent**, which runs the full Article Review Flow:

```
Article
  → 7 Review Skills (parallel)
  → Review Synthesis
  → Revision (if needed)
  → Re-review
  → Final Decision
```

Do not score the article here — enqueue `article-review`.
