# Article Review Workflow

Layer 3 of the Everyday Japan review stack.

```
Article
  → 7 Review Skills (parallel)
  → Review Synthesis (priority, not average)
  → Revision (critical > 0 or major ≥ 2)
  → Re-review
  → Final Decision (PASS | HUMAN_REVIEW | REVISE | FAIL)
```

Implemented in `os/workflows/article-review.ts`.
Invoked by `article-review` agent and CLI:

```bash
npm run editorial:review -- <slug>
```

Artifacts land in `content/reviews/<slug>/`.
