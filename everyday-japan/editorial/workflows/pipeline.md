# Pipeline Workflow

End-to-end process for producing one Everyday Japan article.

```
Topic → Research → Outline → Writing → SEO → Fact Check → Human Review → Publish
```

Each step is independent. Do not skip gates.

---

## 0. Create draft folder

```bash
npm run editorial:new -- "<slug>"
```

Creates `content/drafts/<slug>/` with empty templates.

---

## 1. Topic

1. Gather existing article list from `content/articles/`.
2. Run Topic Finder with `editorial/prompts/01-topic-finder.md`.
3. Save chosen idea as `topic.md`.
4. Human: approve / reject / defer.

**Exit criteria:** Status = `approved`.

---

## 2. Research

1. Open `topic.md` + any editor notes.
2. Run Research Agent with `editorial/prompts/02-research.md`.
3. Save `research.md`.
4. Resolve critical "Things Requiring Verification" before outlining (or explicitly defer with notes).

**Exit criteria:** Enough verified material to explain WHY for 2000–2500 words.

---

## 3. Outline

1. Inputs: `topic.md`, `research.md`.
2. Run Outline Agent.
3. Save `outline.md`.
4. Human skim: structure matches the eight-part template.

**Exit criteria:** Outline approved.

---

## 4. Writing

1. Inputs: topic, research, outline, reference article.
2. Run Writer Agent.
3. Save `draft.md`.
4. Check word count (~2000–2500) and forbidden hype phrases.

**Exit criteria:** Complete draft with all sections including FAQ and closing insight.

---

## 5. SEO

1. Inputs: `topic.md`, `draft.md`, existing slugs.
2. Run SEO Agent.
3. Save `seo.md`.
4. Optionally merge SEO title / meta / tags into draft frontmatter.

**Exit criteria:** SEO package complete; no clickbait.

---

## 6. Fact Check

1. Inputs: draft, research, seo.
2. Run Fact Check Agent.
3. Save `fact-check.md`.
4. Writer/editor applies revisions if verdict is `pass-with-revisions` or `fail`.

**Exit criteria:** Verdict `pass` (or revisions applied and re-checked).

---

## 7. Human Review

1. Generate/complete `review.md` checklist.
2. Human editor reviews against philosophy + reference standard.
3. Note images needed.
4. Approve for publish.

**Exit criteria:** "Approve for publish" checked.

---

## 8. Publish

1. Copy final draft to `content/articles/<slug>.mdx` (or `.md`).
2. Ensure frontmatter is complete.
3. Update related-article links if needed.
4. Archive or keep draft folder for audit trail.

**Exit criteria:** Article live in `content/articles/`.

---

## Status check

```bash
npm run editorial:status -- <slug>
```

## Validate a stage file

```bash
npm run editorial:validate -- <slug> <stage>
```

Stages: `topic` | `research` | `outline` | `draft` | `seo` | `fact-check` | `review`
