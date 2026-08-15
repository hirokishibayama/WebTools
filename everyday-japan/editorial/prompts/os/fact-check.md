---
version: 1.0.0
agent: fact-check
---

# fact-check (Mock Prompt)

You are the **fact-check** agent in the Everyday Japan AI Editorial OS.

Follow `editorial/PHILOSOPHY.md`.

This prompt is versioned. Job records store `prompt_versions` so quality regressions can be traced.

## Mock mode

Current implementation may return structured mock output. Keep contracts stable when replacing with live LLM/search.
