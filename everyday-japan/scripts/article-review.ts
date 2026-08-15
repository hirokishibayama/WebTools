#!/usr/bin/env tsx
/**
 * Article Review Flow CLI — one command end-to-end.
 *
 * Usage:
 *   npm run editorial:review -- why-japanese-people-say-sumimasen-so-often
 */
import fs from "node:fs";
import path from "node:path";
import { clearAgentCache, loadAgent } from "../os/agents/load";
import { ensureDir, isoNow, resolvePath, writeJson } from "../os/store/fs";
import { createJob, saveJob } from "../os/store/jobs";
import type { ArticleReviewDecision, Job } from "../os/types";
import { listPublishedSlugs } from "../os/workflows/article-review";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run editorial:review -- <slug>");
    process.exit(1);
  }

  clearAgentCache();

  const articlePath = resolvePath("articles", `${slug}.md`);
  const contentArticle = resolvePath("content", "articles", slug, "article.md");
  const draftPath = resolvePath("assets", slug, "draft.md");
  ensureDir(path.dirname(draftPath));

  let source = "";
  if (fs.existsSync(articlePath)) {
    fs.copyFileSync(articlePath, draftPath);
    source = articlePath;
  } else if (fs.existsSync(contentArticle)) {
    fs.copyFileSync(contentArticle, draftPath);
    source = contentArticle;
  } else if (fs.existsSync(draftPath)) {
    source = draftPath;
  } else {
    console.error(`No article or draft found for slug: ${slug}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(draftPath, "utf8");
  const titleMatch = raw.match(/^title:\s*"?([^"\n]+)"?/m);
  const title = titleMatch?.[1] ?? slug;
  const draftRel = path.relative(resolvePath(), draftPath);

  console.log(`\n=== Article Review Flow: ${slug} ===`);
  console.log(`source: ${path.relative(resolvePath(), source)}\n`);

  const agent = await loadAgent("article-review");
  const fakeJob: Job = {
    id: `cli_article-review_${Date.now().toString(36)}`,
    type: "quality",
    agent_id: "article-review",
    status: "running",
    created_at: isoNow(),
    updated_at: isoNow(),
    retry_count: 0,
    max_retries: 0,
    dependencies: [],
    payload: { slug, title, draft_path: draftRel },
    priority: 100,
    estimated_cost: 0,
    actual_cost: 0,
    tokens: 0,
    duration_ms: 0,
  };

  const started = Date.now();
  const result = await agent.run(
    { job: fakeJob, workspaceRoot: process.cwd(), now: new Date() },
    {
      slug,
      title,
      draft_path: draftRel,
      existing_articles: listPublishedSlugs(),
      metadata: { title, slug },
      max_revision_rounds: 2,
    }
  );
  const elapsed = Date.now() - started;

  const decision = result.output?.article_review as ArticleReviewDecision;
  const scores = decision.skill_scores;

  console.log("Skill scores:");
  console.log(`  reader                 ${scores.reader}`);
  console.log(`  japanese_perspective   ${scores.japanese_perspective}`);
  console.log(`  cultural_accuracy      ${scores.cultural_accuracy}`);
  console.log(`  fact_source            ${scores.fact_source}`);
  console.log(`  seo                    ${scores.seo}`);
  console.log(`  english                ${scores.english}`);
  console.log(`  originality            ${scores.originality}`);
  console.log("");
  console.log(`Article Review  Score: ${decision.overall_score}`);
  console.log(`Status: ${decision.status}`);
  console.log(`Revision rounds: ${decision.revision_rounds}`);
  console.log(`Critical: ${decision.critical_issues.length}  Major: ${decision.major_issues.length}  Minor: ${decision.minor_issues.length}`);
  console.log(`Summary: ${decision.final_summary}`);
  console.log(`Elapsed: ${elapsed}ms`);
  console.log(`Artifacts: ${result.output?.reviews_dir}`);

  if (decision.major_issues.length || decision.critical_issues.length) {
    console.log("\nTop issues:");
    for (const issue of [...decision.critical_issues, ...decision.major_issues].slice(0, 6)) {
      console.log(`  [${issue.severity}] (${issue.sources.join("+")}) ${issue.problem}`);
    }
  }

  const review = createJob({
    type: "review",
    agent_id: "publish",
    payload: {
      slug,
      title,
      draft_path: draftRel,
      editorial_score: result.output?.editorial_score,
      editorial_score_path: result.output?.editorial_score_path,
      article_review: decision,
      quality_score: decision.overall_score,
      gate: "human_review",
      publish_recommendation: decision.final_summary,
      article_review_status: decision.status,
    },
    idempotency_key: `review:${slug}:article-review`,
    estimated_cost: 0,
    priority: 100,
  });
  review.status = "needs_human";
  review.quality_score = decision.overall_score;
  review.updated_at = isoNow();
  saveJob(review);

  writeJson(resolvePath("content", "reviews", slug, "cli-run.json"), {
    at: isoNow(),
    elapsed_ms: elapsed,
    decision,
    review_job_id: review.id,
  });

  console.log(`\nReview job: ${review.id}`);
  console.log(`Open: /os/review/${review.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
