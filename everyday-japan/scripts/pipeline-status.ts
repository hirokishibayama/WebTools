#!/usr/bin/env tsx
/**
 * Show pipeline completion status for a draft slug.
 *
 * Usage: npm run editorial:status -- <slug>
 *        npm run editorial:status          (lists all drafts)
 */
import { listDraftSlugs, stageStatus } from "../src/lib/editorial/paths";

function printStatus(slug: string) {
  const rows = stageStatus(slug);
  console.log(`\nDraft: ${slug}`);
  console.log("-".repeat(40));
  for (const row of rows) {
    const mark = !row.exists ? "·" : row.empty || row.scaffold ? "○" : "●";
    const note = !row.exists
      ? "missing"
      : row.empty
        ? "empty"
        : row.scaffold
          ? "scaffold"
          : "filled";
    console.log(`  ${mark} ${row.stage.padEnd(12)} ${row.file} (${note})`);
  }
  const done = rows.filter((r) => r.exists && !r.empty && !r.scaffold).length;
  console.log(`\n  Progress: ${done}/${rows.length} stages filled`);
}

function main() {
  const slug = process.argv[2];
  if (!slug) {
    const slugs = listDraftSlugs();
    if (slugs.length === 0) {
      console.log("No drafts found. Create one with: npm run editorial:new -- <slug>");
      return;
    }
    for (const s of slugs) printStatus(s);
    return;
  }
  printStatus(slug);
}

main();
