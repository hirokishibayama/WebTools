# Everyday Japan — AI Editorial OS

**AI Editorial Operating System** for explaining ordinary Japanese life to foreign visitors.

Not a blog CMS. Not a writing assistant.

A **content factory** where agents produce articles and humans act as editor-in-chief.

---

## Morning loop (target)

```
Scheduler
 → 100 topic candidates
 → score → Top10
 → research → outline → writing (parent + children)
 → image prompts → SEO → internal links
 → fact check
 → human review (~10 min)
 → publish
 → analytics → improve next scoring
```

---

## Quick start

```bash
cd everyday-japan
npm install

# Reset mock state, run factory until Review queue fills
npm run os:reset
npm run scheduler

# Dashboard
npm run dev
# → http://localhost:3000
```

Review UI actions: **Preview · Approve · Reject · Needs Rewrite**

---

## Key paths

| Path | Purpose |
|------|---------|
| `os/ARCHITECTURE.md` | Full OS design |
| `os/agents/registry.json` | Add agents here |
| `os/policies/` | TopN, scores, retries |
| `jobs/` | Job store (JSON, date-partitioned) |
| `articles/` | Published content |
| `assets/` | Per-slug artifacts |
| `editorial/prompts/os/` | Versioned prompts |
| `data/feedback/` | Analytics → scoring loop |

---

## CLI

```bash
npm run scheduler              # daily run + drain queues
npm run scheduler -- --no-drain
npm run worker -- --max=50
npm run os:reset               # clear jobs (keep articles)
npm run os:reset:all           # clear jobs + articles
```

---

## Editorial standard

See `editorial/PHILOSOPHY.md` and `reference/konbini.md`.

Tone: local perspective, explain WHY, never “Japan is amazing.”
