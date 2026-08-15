#!/usr/bin/env tsx
/**
 * Create a new article draft folder with empty stage templates.
 *
 * Usage: npm run editorial:new -- <slug-or-title>
 */
import fs from "node:fs";
import path from "node:path";
import { draftDir, slugify, templatesRoot } from "../src/lib/editorial/paths";

const TEMPLATE_MAP: Record<string, string> = {
  "topic.md": "topic.md",
  "research.md": "research.md",
  "outline.md": "outline.md",
  "draft.md": "article.md",
  "seo.md": "seo.md",
  "fact-check.md": "fact-check.md",
  "review.md": "review.md",
};

function main() {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) {
    console.error("Usage: npm run editorial:new -- <slug-or-title>");
    process.exit(1);
  }

  const slug = slugify(raw);
  if (!slug) {
    console.error("Could not derive a valid slug from:", raw);
    process.exit(1);
  }

  const dir = draftDir(slug);
  if (fs.existsSync(dir)) {
    console.error(`Draft already exists: content/drafts/${slug}`);
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const tplRoot = templatesRoot();

  for (const [outName, tplName] of Object.entries(TEMPLATE_MAP)) {
    const src = path.join(tplRoot, tplName);
    let body = fs.readFileSync(src, "utf8");
    body = body
      .replaceAll("{{TITLE}}", raw)
      .replaceAll("{{SLUG}}", slug)
      .replaceAll("{{DATE}}", today)
      .replaceAll("{{AGENT_OR_HUMAN}}", "");
    fs.writeFileSync(path.join(dir, outName), body);
  }

  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# Draft: ${raw}\n\n**Slug:** \`${slug}\`\n\nFollow \`editorial/workflows/pipeline.md\`.\n\nCheck status:\n\n\`\`\`bash\nnpm run editorial:status -- ${slug}\n\`\`\`\n`
  );

  console.log(`Created content/drafts/${slug}/`);
  console.log("Next: fill topic.md, then run the Topic Finder / approve the topic.");
}

main();
