---
name: everyday-japan-article-review
description: >-
  Runs Everyday Japan Article Review Flow as a Cursor Agent editor: seven specialist
  reviews (reader, Japanese perspective, cultural accuracy, fact/source, SEO intent,
  English naturalness, originality), issue synthesis, safe revision, re-review, and
  PASS/HUMAN_REVIEW/REVISE/FAIL. Use when the user asks to review an Everyday Japan
  article, run Article Review, Multi Review, editorial review, or quality-check a
  slug under everyday-japan/content/articles or everyday-japan/articles.
---

# Everyday Japan — Article Review

You are an **editor**, not a scoring machine. Use the chat model to read and judge the article. Do **not** run `npm run editorial:review` or other mock CLI heuristics.

## When invoked

1. Resolve the target article (slug, path, or open file).
2. Read philosophy: `everyday-japan/editorial/PHILOSOPHY.md`
3. Load checklists: [reviews.md](reviews.md)
4. Run the flow below end-to-end in this chat.
5. Write artifacts under `everyday-japan/content/reviews/<slug>/`
6. Reply with Final Decision summary in Japanese unless the user asks otherwise.

## Locate the article

Prefer, in order:

1. Path the user gave
2. `everyday-japan/content/articles/<slug>/article.md`
3. `everyday-japan/articles/<slug>.md`
4. `everyday-japan/assets/<slug>/draft.md`

Also skim sibling published titles in `everyday-japan/articles/` for originality / overlap context (`existing_articles`).

## Flow (one chat run)

```
Article
  → 7 Review Skills (parallel reasoning; write all 7 JSON files)
  → Review Synthesis
  → Revision (if critical > 0 OR major ≥ 2)
  → 7 Review Skills again
  → Final Decision
```

Max **2** revision rounds. After the last synthesis, if critical issues remain → **FAIL**.

### Round artifacts

```
everyday-japan/content/reviews/<slug>/
├── round-1/
│   ├── reader.json
│   ├── japanese-perspective.json
│   ├── cultural-accuracy.json
│   ├── fact-source.json
│   ├── seo.json
│   ├── english.json
│   └── originality.json
├── synthesis-1.json
├── revision-1.json          # only if revised
├── round-2/ ...            # only if re-reviewed
├── synthesis-2.json
└── final-review.json
```

Each skill JSON:

```json
{
  "reviewer": "reader-experience",
  "score": 0,
  "status": "pass | revise | fail",
  "strengths": [],
  "issues": [
    {
      "severity": "critical | major | minor",
      "location": "section or quote",
      "problem": "",
      "suggestion": ""
    }
  ]
}
```

`fact-source.json` may also include `verified`, `questionable`, `unsupported`, `needs_source`.

## Synthesis (not a plain average)

Priority (highest first):

1. Critical factual error
2. Cultural accuracy
3. Japanese perspective
4. Reader experience
5. Originality
6. English
7. SEO

SEO alone must **not** force a full rewrite.

Aggregate issues: if two skills flag the same place/theme (e.g. over-generalization), merge into **one** issue with `sources: ["cultural-accuracy", "japanese-perspective"]`.

Write `synthesis-N.json` with aggregated issues, skill scores, and whether revision is required.

## Revision rules

Trigger when **critical > 0** OR **major ≥ 2**.

When revising the article file:

- Edit from review issues only
- **Never invent new facts**
- `unsupported` / weak claims → delete or hedge (`One reason may be…`, `For many people in Japan…`)
- Do not add FAQ content you cannot ground in the draft
- Prefer patching `content/articles/<slug>/article.md` if that is the source of truth; otherwise patch the file you reviewed and note the path in `revision-N.json`

After each revision, re-run all 7 skills on the revised text.

## Final Decision

Write `final-review.json`:

```json
{
  "status": "PASS | HUMAN_REVIEW | REVISE | FAIL",
  "overall_score": 0,
  "critical_issues": [],
  "major_issues": [],
  "minor_issues": [],
  "revision_rounds": 0,
  "skill_scores": {
    "reader": 0,
    "japanese_perspective": 0,
    "cultural_accuracy": 0,
    "fact_source": 0,
    "seo": 0,
    "english": 0,
    "originality": 0
  },
  "final_summary": ""
}
```

Decision rules (after revision loop):

| Condition | Status |
|-----------|--------|
| Any critical remains | `FAIL` |
| Score ≥ 85 and no critical | `PASS` |
| Score 75–84 | `HUMAN_REVIEW` |
| Score ≤ 74 | `REVISE` |

Overall score must reflect priority vetoes (e.g. Cultural 60 + others 95 ≠ PASS).

## Chat reply (keep short)

1. **Article Review** — Score / Status
2. Critical / major counts + revision rounds
3. Top 3–5 issues (merged)
4. What you changed (if revised)
5. Path to `final-review.json`

Expand 7 skill details only if the user asks.

## Anti-patterns

- Do not call mock OS review CLIs
- Do not treat this as a rubric-only scorer
- Do not exoticize Japan or invent Japanese first-person anecdotes while “fixing”
