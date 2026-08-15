---
version: 1.0.0
agent: article-review
---

# Article Review Agent

Layer 2 orchestrator for Everyday Japan Article Review Flow.

## Concept

```
Article Review Agent
  └── Review Skills × 7
        ├── Reader Experience
        ├── Japanese Perspective
        ├── Cultural Accuracy
        ├── Fact & Source
        ├── SEO & Search Intent
        ├── English Naturalness
        └── Editorial Originality
```

## Input

- `article` / draft path
- `metadata`
- `existing_articles`

## Output

`review_report` / `final-review.json` with Final Decision:

- PASS
- HUMAN_REVIEW
- REVISE
- FAIL

## Behavior

1. Run 7 skills in parallel
2. Synthesize (priority order — not plain average)
3. Aggregate duplicate issues
4. Revision if critical > 0 or major ≥ 2
5. Re-review (max 2 revision rounds)
6. Final decision

Act as an **editor**, not a scoring machine.
