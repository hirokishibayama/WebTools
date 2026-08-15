# Everyday Japan — AI Editorial OS Architecture

> Goal: AI produces daily content; humans act as editor-in-chief (~10 min/article).
> Scale target: **100,000 articles** — Agent / Queue / Workflow must be easy to extend.

## Mental model

```
Scheduler → Queues → Workers → Agents → Jobs + Artifacts
                              ↓
                         Human Review (gate)
                              ↓
                           Publish
                              ↓
                     Analytics → Topic Scoring feedback
```

This is a **content factory**, not a CMS and not a writing assistant.

## Directory layout

```
os/                  # Operating system core
  agents/            # Implementations + registry.json
  policies/          # Thresholds, weights, routing knobs
  store/             # JSON job persistence
  worker/            # Claim → run → enqueue
  scheduler/         # Daily entrypoint
  metrics/           # Factory KPI snapshots
jobs/                # Partitioned job files (source of truth)
articles/            # Published markdown
assets/{slug}/       # Per-article artifacts (research, draft, seo, …)
data/
  index/             # candidates, sitemap, jobs-index
  metrics/           # Dashboard snapshot
  analytics/         # Mock GSC/GA4
  feedback/          # Scoring weight feedback loop
editorial/           # Philosophy, versioned prompts, templates
src/                 # Next.js Dashboard + Review UI
```

Deprecated (compat only): `content/drafts/` — do not add new work there.

## Queues

| Queue | Role |
|-------|------|
| trend | Collect ~100 candidates |
| topic | Score + duplicate gate |
| research | Structured research |
| outline | Quality-structure gate |
| writing | Parent orchestrator + draft child |
| media | Image prompts (no image gen) |
| seo | SEO + internal links |
| fact-check | Claim / bias gate |
| review | Human: Preview / Approve / Reject / Needs Rewrite |
| publish | Article + metadata + sitemap |
| analytics | Traffic mock → scoring feedback |
| _failed | Dead letter |

## Job schema (essentials)

- `status`, `created_at`, `updated_at`, `retry_count`, `dependencies`
- `quality_score`
- `estimated_cost`, `actual_cost`, `tokens`, `duration_ms`
- `prompt_versions`
- Date-partitioned path: `jobs/{queue}/{yyyy}/{mm}/{dd}/{id}.json`
- Global index: `data/index/jobs-index.json` (avoid full-tree scans)

## Agent registry

Agents are **not** hard-wired in worker code.

1. Add module under `os/agents/<id>/`
2. Register in `os/agents/registry.json`
3. Add versioned prompt under `editorial/prompts/os/`

Worker loads via `loadAgent(id)`.

## Writing: parent + children

```
writing (parent)
  └─ draft
       └─ introduction
            └─ japanese-perspective
                 ├─ image-prompt
                 ├─ seo
                 └─ internal-link
                      └─ fact-check
                           └─ editorial-quality
                                └─ article-review (Article Review Flow)
                                     ├── Review Skills × 7 (parallel)
                                     ├── Review Synthesis
                                     ├── Revision loop (max 2)
                                     └── Final Decision → review (human) → publish
```

Article Review Agent orchestrates seven independent skills; Editorial Score nests the final decision.

## Self-improvement loop

```
Analytics Agent
  → data/feedback/scoring-weights.json
  → Topic Scoring Agent reads weights next run
  → better Top10 selection
```

## CLI

```bash
npm run scheduler     # create trend+analytics jobs and drain
npm run worker        # process ready jobs
npm run os:reset      # clear jobs/metrics/assets (keep articles)
npm run dev           # Dashboard
```

## Extending for 100k

- Keep prompts & policies outside code
- Keep Job contracts stable; swap Agent modules
- Partition jobs by date; use index for queries
- Migrate `jobs/*.json` → SQLite only after ~100 published articles if needed
