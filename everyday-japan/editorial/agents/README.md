# Agent Registry

Each agent is a replaceable stage. Config files declare inputs, outputs, and prompt paths so orchestration (human or automated) can run them independently.

| ID | Name | Prompt | Config |
|----|------|--------|--------|
| topic-finder | Topic Finder | `../prompts/01-topic-finder.md` | `topic-finder.json` |
| research | Research Agent | `../prompts/02-research.md` | `research.json` |
| outline | Outline Agent | `../prompts/03-outline.md` | `outline.json` |
| writer | Writer Agent | `../prompts/04-writer.md` | `writer.json` |
| seo | SEO Agent | `../prompts/05-seo.md` | `seo.json` |
| fact-check | Fact Check Agent | `../prompts/06-fact-check.md` | `fact-check.json` |
| human-review | Human Review | `../prompts/07-human-review.md` | `human-review.json` |

Shared system prompt: `../prompts/00-system.md`
