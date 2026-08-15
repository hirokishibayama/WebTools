# Future Automation

This document describes how the pipeline should evolve without restructuring folders or agent contracts.

## Target Flow

```
Web Search
    ↓
Research Agent
    ↓
Outline Agent
    ↓
Writer Agent
    ↓
SEO Agent
    ↓
Fact Checker
    ↓
Human Review
    ↓
Publish
```

## What Exists Today

- Prompts separated from code (`editorial/prompts/`)
- Agent configs with explicit inputs/outputs (`editorial/agents/*.json`)
- Templates separated from filled data (`editorial/templates/` → `content/drafts/`)
- Replaceable stages (any agent can be swapped for another model or human)
- CLI scaffolding for draft creation and status (`scripts/`)

## What Is Intentionally Missing

- Automatic web search
- Model API orchestration
- Auto-publish

These must be added as **adapters**, not by rewriting editorial content.

## Recommended Adapter Shape

Future code can:

1. Load agent JSON config
2. Load system + stage prompts
3. Load required input files from `content/drafts/<slug>/`
4. Optionally call a `SearchProvider` for research / fact-check
5. Write outputs back to the same filenames
6. Stop before human review / publish

Example interface sketch (not implemented):

```ts
interface StageRunner {
  run(slug: string, agentId: string, options?: { search?: SearchProvider }): Promise<void>;
}

interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
```

## Constraints for Future Work

- Do not embed prompts inside TypeScript strings as the source of truth — keep `.md` files authoritative.
- Do not skip Human Review.
- Keep artifact filenames stable (`topic.md`, `research.md`, …) so tools and humans share one contract.
- Prefer adding `scripts/run-stage.ts` over coupling agents to the Next.js UI.
