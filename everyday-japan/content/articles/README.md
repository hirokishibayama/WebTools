# Content packages

Each article under `content/articles/{slug}/` is a review-ready package:

| File | Purpose |
|------|---------|
| `article.md` | Full article body + frontmatter |
| `metadata.json` | SEO title, description, slug, tags, H2 list |
| `image-prompts.md` | Hero / OGP prompts |
| `quality-report.json` | Introduction / JP perspective / Editorial Score |

Canonical working copies also live in `articles/{slug}.md` for the Next.js site.

Status:

- `published` — live on the public homepage
- `review` — previewable, waiting for human approve in `/os`
