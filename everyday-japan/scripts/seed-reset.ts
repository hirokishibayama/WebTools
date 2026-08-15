#!/usr/bin/env tsx
/**
 * Reset mock factory state (jobs index + generated data). Keeps articles unless --all.
 */
import fs from "node:fs";
import path from "node:path";

function rmrf(p: string) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function main() {
  const all = process.argv.includes("--all");
  const root = process.cwd();

  for (const q of [
    "trend",
    "topic",
    "research",
    "outline",
    "writing",
    "media",
    "seo",
    "fact-check",
    "quality",
    "review",
    "publish",
    "analytics",
    "_failed",
  ]) {
    rmrf(path.join(root, "jobs", q));
    fs.mkdirSync(path.join(root, "jobs", q), { recursive: true });
  }

  rmrf(path.join(root, "data/index"));
  rmrf(path.join(root, "data/metrics"));
  rmrf(path.join(root, "data/analytics"));
  rmrf(path.join(root, "data/feedback"));
  rmrf(path.join(root, "assets"));

  fs.mkdirSync(path.join(root, "data/index"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/metrics"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/analytics"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/feedback"), { recursive: true });
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });

  if (all) {
    rmrf(path.join(root, "articles"));
    fs.mkdirSync(path.join(root, "articles"), { recursive: true });
  }

  console.log("Mock factory state cleared." + (all ? " (articles too)" : ""));
}

main();
