# Agents

All agents are registered in [`registry.json`](./registry.json).

To add an agent:

1. Create `os/agents/<id>/index.ts` exporting default `Agent`
2. Add an entry to `registry.json`
3. Add a versioned prompt at `editorial/prompts/os/<id>.md`

Quality pipeline additions:

- `introduction` — opening hook pass
- `japanese-perspective` — local perspective pass
- `editorial-quality` — delegates to Article Review Agent
- `article-review` — Article Review Flow (7 skills → synthesis → revision → decision)
- Review Skills × 7 — independent specialist reviewers under article-review
- `final-editorial-review` / `revision` — legacy/compat path (flow prefers in-process revision)

The worker loads agents dynamically — no hard-coded switch statements.
Writing/quality parents use reconcile helpers in `os/worker/runner.ts` for the legacy multi-job path.
