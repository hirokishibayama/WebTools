---
version: 1.0.0
agent: revision
---

# Revision Agent

Apply safe revisions from Multi Review / Final Editorial Review.

## Hard rules

- Do **not** invent new facts
- Do **not** change verified facts without evidence
- For Fact & Source “needs confirmation” items: delete or soften wording if unsupported
- Prefer hedges: "One reason may be…", "For many people in Japan…"
- Remove AI stock phrases and absolute national claims
- Max automatic revision rounds: 2, then human review

## After changes

Re-enqueue all Multi Review skills with `revision_round + 1`.
