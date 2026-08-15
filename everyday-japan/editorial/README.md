# Editorial System Overview

This folder contains everything needed to run the Everyday Japan editorial pipeline.

## Contents

| Path | Purpose |
|------|---------|
| `prompts/` | System and stage prompts for each agent |
| `agents/` | Agent metadata: inputs, outputs, dependencies |
| `templates/` | Empty Markdown skeletons for each stage artifact |
| `workflows/` | How to run the pipeline end-to-end |
| `checklists/` | Human review and publish gates |
| `PHILOSOPHY.md` | Editorial rules every agent must follow |

## Design Principles

1. **Prompts separate from code** — swap models without rewriting logic.
2. **Data separate from templates** — fill templates; do not hardcode content into prompts.
3. **Stages are replaceable** — any agent can be upgraded, automated, or run by a human.
4. **Automation-ready** — web search and orchestration can plug in later without restructuring.

## Stage Artifacts

For each article slug under `content/drafts/<slug>/`:

```
topic.md
research.md
outline.md
draft.md
seo.md
fact-check.md
review.md
```

Published articles move to `content/articles/<slug>.mdx`.
