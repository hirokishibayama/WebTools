#!/usr/bin/env tsx
/**
 * Run Article Review Flow against a published article or draft.
 *
 * Usage:
 *   npm run editorial:score -- why-japanese-people-say-sumimasen-so-often
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run editorial:score -- <slug>");
  process.exit(1);
}

const script = path.join(__dirname, "article-review.ts");
const result = spawnSync("npx", ["tsx", script, slug], {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  env: process.env,
});
process.exit(result.status ?? 1);
