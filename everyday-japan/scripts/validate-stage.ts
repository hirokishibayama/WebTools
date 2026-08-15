#!/usr/bin/env tsx
/**
 * Lightweight structural validation for a stage artifact.
 *
 * Usage: npm run editorial:validate -- <slug> <stage>
 */
import fs from "node:fs";
import path from "node:path";
import { draftDir } from "../src/lib/editorial/paths";
import { STAGE_FILES, type PipelineStage } from "../src/types/editorial";

const REQUIRED_HEADINGS: Partial<Record<Exclude<PipelineStage, "publish">, string[]>> = {
  topic: ["Title", "Target keyword", "Search intent", "Reader questions", "Priority", "Category"],
  research: [
    "Facts",
    "Interesting Observations",
    "Common Misconceptions",
    "Historical Background",
    "Practical Visitor Advice",
    "Possible FAQ",
    "Things Requiring Verification",
  ],
  outline: [
    "1. Hook",
    "2. The Question",
    "3. Local Perspective",
    "4. Cultural Background",
    "5. Real-life Examples",
    "6. Visitor Tips",
    "7. FAQ",
    "8. Closing Insight",
  ],
  draft: ["FAQ"],
  seo: ["SEO Title", "Meta Description", "Slug", "Tags", "Schema Metadata"],
  "fact-check": [
    "Verified Facts",
    "Statements Needing Citation",
    "Possible Bias",
    "Outdated Information",
    "Unsupported Claims",
    "Overall Verdict",
  ],
  review: ["Editorial Quality", "Decision"],
};

function main() {
  const slug = process.argv[2];
  const stage = process.argv[3] as Exclude<PipelineStage, "publish"> | undefined;

  if (!slug || !stage || !(stage in STAGE_FILES)) {
    console.error("Usage: npm run editorial:validate -- <slug> <stage>");
    console.error("Stages:", Object.keys(STAGE_FILES).join(" | "));
    process.exit(1);
  }

  const file = STAGE_FILES[stage];
  const full = path.join(draftDir(slug), file);
  if (!fs.existsSync(full)) {
    console.error(`Missing: ${full}`);
    process.exit(1);
  }

  const body = fs.readFileSync(full, "utf8");
  if (!body.trim()) {
    console.error(`${file} is empty`);
    process.exit(1);
  }

  const required = REQUIRED_HEADINGS[stage] ?? [];
  const missing = required.filter((h) => !body.includes(h));

  if (missing.length) {
    console.error(`Validation failed for ${slug}/${file}`);
    for (const m of missing) console.error(`  - missing: ${m}`);
    process.exit(1);
  }

  if (stage === "draft") {
    const words = body.split(/\s+/).filter(Boolean).length;
    if (words < 1500) {
      console.warn(`Warning: draft word count looks low (~${words}). Target 2000–2500.`);
    }
  }

  console.log(`OK: content/drafts/${slug}/${file}`);
}

main();
