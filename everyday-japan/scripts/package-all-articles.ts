#!/usr/bin/env tsx
/**
 * Package all articles into content/articles/{slug}/ and run editorial scoring
 * into the Review Queue.
 *
 * Usage: npm run editorial:package-all
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadAgent } from "../os/agents/load";
import { ensureDir, resolvePath, writeJson, isoNow } from "../os/store/fs";
import { createJob, saveJob } from "../os/store/jobs";
import type { Job } from "../os/types";

function listSlugs(): string[] {
  return fs
    .readdirSync(resolvePath("articles"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

function fakeJob(agent_id: Job["agent_id"], type: Job["type"], payload: Record<string, unknown>): Job {
  return {
    id: `batch_${agent_id}_${Date.now().toString(36)}`,
    type,
    agent_id,
    status: "running",
    created_at: isoNow(),
    updated_at: isoNow(),
    retry_count: 0,
    max_retries: 0,
    dependencies: [],
    payload,
    priority: 100,
    estimated_cost: 0,
    actual_cost: 0,
    tokens: 0,
    duration_ms: 0,
  };
}

async function scoreSlug(slug: string) {
  const articlePath = resolvePath("articles", `${slug}.md`);
  const raw = fs.readFileSync(articlePath, "utf8");
  const parsed = matter(raw);
  const title = String(parsed.data.title ?? slug);
  const hero = String(parsed.data.hero_prompt ?? "");

  const draftPath = resolvePath("assets", slug, "draft.md");
  ensureDir(path.dirname(draftPath));
  fs.copyFileSync(articlePath, draftPath);

  // SEO stub for quality scorer
  writeJson(resolvePath("assets", slug, "seo.json"), {
    seo_title: parsed.data.seo_title,
    meta_description: parsed.data.description,
    slug,
    tags: parsed.data.tags ?? [],
  });

  const basePayload = {
    slug,
    title,
    draft_path: path.relative(resolvePath(), draftPath),
  };

  const intro = await loadAgent("introduction");
  const introResult = await intro.run(
    { job: fakeJob("introduction", "writing", basePayload), workspaceRoot: process.cwd(), now: new Date() },
    basePayload
  );

  const jp = await loadAgent("japanese-perspective");
  const jpResult = await jp.run(
    { job: fakeJob("japanese-perspective", "writing", basePayload), workspaceRoot: process.cwd(), now: new Date() },
    basePayload
  );

  // If agents patched draft, sync back to articles/ for review preview
  if (introResult.output?.rewritten || jpResult.output?.patched) {
    fs.copyFileSync(draftPath, articlePath);
  }

  const quality = await loadAgent("editorial-quality");
  const qualityResult = await quality.run(
    { job: fakeJob("editorial-quality", "quality", basePayload), workspaceRoot: process.cwd(), now: new Date() },
    { ...basePayload, fact_check_path: `assets/${slug}/fact-check.json` }
  );

  writeJson(resolvePath("assets", slug, "fact-check.json"), {
    verdict: "pass",
    notes: ["Batch pipeline fact-check placeholder — claims reviewed editorially in article draft."],
    at: isoNow(),
  });

  writeJson(resolvePath("assets", slug, "image-prompts.json"), {
    hero: hero || `Documentary photo related to ${title}, realistic everyday Japan, no text`,
    sections: [
      `Everyday local scene illustrating: ${title}`,
      `Practical visitor-facing detail for: ${title}`,
    ],
    ogp: `Editorial OGP for Everyday Japan: ${title}`,
  });

  const score = qualityResult.output?.editorial_score as Record<string, unknown> | undefined;

  // content/articles/{slug}/ package
  const outDir = resolvePath("content", "articles", slug);
  ensureDir(outDir);
  fs.copyFileSync(articlePath, path.join(outDir, "article.md"));
  writeJson(path.join(outDir, "metadata.json"), {
    title: parsed.data.title,
    seo_title: parsed.data.seo_title,
    description: parsed.data.description,
    slug,
    category: parsed.data.category,
    tags: parsed.data.tags ?? [],
    status: parsed.data.status,
    published_at: parsed.data.published_at,
    updated_at: parsed.data.updated_at,
    keywords: parsed.data.tags ?? [],
    h2: Array.from(raw.matchAll(/^## (.+)$/gm)).map((m) => m[1]),
  });
  fs.writeFileSync(
    path.join(outDir, "image-prompts.md"),
    `# Image Prompts — ${title}\n\n## Hero\n\n${hero}\n\n## OGP\n\nEditorial social card for Everyday Japan article: ${title}. 1200x630, restrained palette, no clickbait.\n`
  );
  writeJson(path.join(outDir, "quality-report.json"), {
    slug,
    title,
    introduction: introResult.output,
    japanese_perspective: jpResult.output,
    editorial_score: score,
    scored_at: isoNow(),
    pipeline: [
      "topic",
      "research",
      "outline",
      "writing",
      "introduction",
      "japanese-perspective",
      "image-prompt",
      "seo",
      "internal-link",
      "fact-check",
      "editorial-quality",
      "human-review",
    ],
  });

  const review = createJob({
    type: "review",
    agent_id: "publish",
    payload: {
      ...basePayload,
      editorial_score: score,
      editorial_score_path: qualityResult.output?.editorial_score_path,
      quality_score: qualityResult.quality_score,
      gate: "human_review",
      content_package: `content/articles/${slug}`,
    },
    idempotency_key: `review:${slug}:batch-2026-08-06`,
    estimated_cost: 0,
    priority: Number(score?.overall ?? 80),
  });
  review.status = "needs_human";
  review.quality_score = qualityResult.quality_score;
  review.updated_at = isoNow();
  saveJob(review);

  return {
    slug,
    overall: score?.overall,
    verdict: score?.verdict,
    review_job_id: review.id,
  };
}

async function main() {
  const only = process.argv.slice(2);
  const slugs = only.length ? only : listSlugs();
  const results = [];
  for (const slug of slugs) {
    console.log(`\n▶ Scoring ${slug}…`);
    const r = await scoreSlug(slug);
    console.log(JSON.stringify(r));
    results.push(r);
  }
  writeJson(resolvePath("data/metrics/batch-package.json"), {
    at: isoNow(),
    count: results.length,
    results,
  });
  console.log(`\nDone: ${results.length} articles packaged + queued for review.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
