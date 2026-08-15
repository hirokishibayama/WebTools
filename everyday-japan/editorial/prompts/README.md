# Prompts

Authoritative prompt files for each pipeline agent.

Always include `00-system.md` (or its summary) with the stage prompt.

| File | Agent |
|------|-------|
| `00-system.md` | Shared context |
| `01-topic-finder.md` | Topic Finder |
| `02-research.md` | Research |
| `03-outline.md` | Outline |
| `04-writer.md` | Writer |
| `05-seo.md` | SEO |
| `06-fact-check.md` | Fact Check |
| `07-human-review.md` | Human Review |

Keep prompts in Markdown — do not move the source of truth into TypeScript string literals.
