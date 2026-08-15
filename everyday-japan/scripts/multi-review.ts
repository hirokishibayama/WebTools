#!/usr/bin/env tsx
/**
 * Run Multi Review skills + Final Editorial Review against an article.
 *
 * Usage:
 *   npm run editorial:multi-review -- why-japanese-people-say-sumimasen-so-often
 */
import fs from "node:fs";
import path from "node:path";
import { loadAgent, clearAgentCache } from "../os/agents/load";
import { ensureDir, resolvePath, writeJson, isoNow } from "../os/store/fs";
import { createJob, saveJob } from "../os/store/jobs";
import type { Job, SkillReviewResult } from "../os/types";
import { MULTI_REVIEW_CHILDREN, REVIEWER_IDS } from "../os/agents/_review";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run editorial:multi-review -- <slug>");
    process.exit(1);
  }

  clearAgentCache();

  const articlePath = resolvePath("articles", `${slug}.md`);
  const contentArticle = resolvePath("content", "articles", slug, "article.md");
  const draftPath = resolvePath("assets", slug, "draft.md");
  ensureDir(path.dirname(draftPath));

  if (fs.existsSync(articlePath)) {
    fs.copyFileSync(articlePath, draftPath);
  } else if (fs.existsSync(contentArticle)) {
    fs.copyFileSync(contentArticle, draftPath);
  } else if (!fs.existsSync(draftPath)) {
    console.error(`No article or draft found for slug: ${slug}`);
    process.exit(1);
  }

  const titleMatch = fs.readFileSync(draftPath, "utf8").match(/^title:\s*"?([^"\n]+)"?/m);
  const title = titleMatch?.[1] ?? slug;
  const draftRel = path.relative(resolvePath(), draftPath);

  const basePayload = {
    slug,
    title,
    draft_path: draftRel,
    revision_round: 0,
    quality_parent_id: `manual_quality_${Date.now().toString(36)}`,
  };

  const fakeJob = (agent_id: Job["agent_id"], type: Job["type"]): Job => ({
    id: `manual_${agent_id}_${Date.now().toString(36)}`,
    type,
    agent_id,
    status: "running",
    created_at: isoNow(),
    updated_at: isoNow(),
    retry_count: 0,
    max_retries: 0,
    dependencies: [],
    payload: basePayload,
    priority: 100,
    estimated_cost: 0,
    actual_cost: 0,
    tokens: 0,
    duration_ms: 0,
  });

  console.log(`\n=== Multi Review: ${slug} ===\n`);

  const skillResults: SkillReviewResult[] = [];
  for (const agentId of MULTI_REVIEW_CHILDREN) {
    const agent = await loadAgent(agentId);
    const started = Date.now();
    const result = await agent.run(
      { job: fakeJob(agentId, "quality"), workspaceRoot: process.cwd(), now: new Date() },
      basePayload
    );
    const review = result.output?.review as SkillReviewResult;
    skillResults.push(review);
    const label = REVIEWER_IDS[agentId as keyof typeof REVIEWER_IDS] ?? agentId;
    console.log(
      `${label.padEnd(24)} score=${String(review.score).padStart(3)}  status=${review.status.padEnd(6)}  issues=${review.issues.length}  ${Date.now() - started}ms`
    );
  }

  const finalAgent = await loadAgent("final-editorial-review");
  const finalResult = await finalAgent.run(
    {
      job: fakeJob("final-editorial-review", "quality"),
      workspaceRoot: process.cwd(),
      now: new Date(),
    },
    {
      ...basePayload,
      fact_check_path: `assets/${slug}/fact-check.json`,
    }
  );

  const score = finalResult.output?.editorial_score as
    | {
        final_review?: {
          publish_recommendation?: string;
          priority_revisions?: string[];
        };
      }
    | undefined;
  const status = finalResult.output?.status;
  const next = finalResult.output?.next;

  console.log("\n=== Final Editorial Review ===");
  console.log(`overall: ${finalResult.output?.overall_score}`);
  console.log(`status:  ${status}`);
  console.log(`next:    ${next}`);
  if (score?.final_review?.publish_recommendation) {
    console.log(`recommendation: ${score.final_review.publish_recommendation}`);
  }
  if (score?.final_review?.priority_revisions?.length) {
    console.log("\nPriority revisions:");
    for (const r of score.final_review.priority_revisions) {
      console.log(`  - ${r}`);
    }
  }

  // Optional: run one revision + re-review if revise
  let revisionApplied: string[] = [];
  let afterRevision: SkillReviewResult[] | null = null;
  let afterFinal: Record<string, unknown> | null = null;

  if (status === "revise" && next === "revision") {
    console.log("\n=== Automatic Revision (round 1) ===");
    const revAgent = await loadAgent("revision");
    const revResult = await revAgent.run(
      { job: fakeJob("revision", "quality"), workspaceRoot: process.cwd(), now: new Date() },
      {
        ...basePayload,
        ...finalResult.output,
        priority_revisions: score?.final_review?.priority_revisions,
        multi_reviews: skillResults,
      }
    );
    revisionApplied = (revResult.output?.applied as string[]) ?? [];
    console.log("applied:", revisionApplied.length ? revisionApplied : "(no text changes)");

    const roundPayload = {
      ...basePayload,
      revision_round: 1,
      draft_path: draftRel,
    };
    afterRevision = [];
    for (const agentId of MULTI_REVIEW_CHILDREN) {
      const agent = await loadAgent(agentId);
      const result = await agent.run(
        { job: fakeJob(agentId, "quality"), workspaceRoot: process.cwd(), now: new Date() },
        roundPayload
      );
      const review = result.output?.review as SkillReviewResult;
      afterRevision.push(review);
      const label = REVIEWER_IDS[agentId as keyof typeof REVIEWER_IDS] ?? agentId;
      console.log(
        `re-review ${label.padEnd(20)} score=${String(review.score).padStart(3)}  status=${review.status}`
      );
    }

    const final2 = await finalAgent.run(
      {
        job: fakeJob("final-editorial-review", "quality"),
        workspaceRoot: process.cwd(),
        now: new Date(),
      },
      { ...roundPayload, fact_check_path: `assets/${slug}/fact-check.json` }
    );
    afterFinal = final2.output ?? null;
    console.log(
      `\nAfter revision final: overall=${final2.output?.overall_score} status=${final2.output?.status}`
    );
  }

  const reviewScore =
    (afterFinal?.editorial_score as { overall?: number } | undefined)?.overall ??
    finalResult.quality_score;
  const review = createJob({
    type: "review",
    agent_id: "publish",
    payload: {
      ...basePayload,
      editorial_score: afterFinal?.editorial_score ?? score,
      editorial_score_path:
        afterFinal?.editorial_score_path ?? finalResult.output?.editorial_score_path,
      quality_score: reviewScore,
      gate: "human_review",
      publish_recommendation:
        (afterFinal?.editorial_score as { final_review?: { publish_recommendation?: string } })
          ?.final_review?.publish_recommendation ??
        score?.final_review?.publish_recommendation,
    },
    idempotency_key: `review:${slug}:multi-review`,
    estimated_cost: 0,
    priority: 100,
  });
  review.status = "needs_human";
  review.quality_score = Number(reviewScore ?? 0);
  review.updated_at = isoNow();
  saveJob(review);

  writeJson(resolvePath("assets", slug, "multi-review-run.json"), {
    at: isoNow(),
    slug,
    initial_reviews: skillResults,
    initial_final: finalResult.output,
    revision_applied: revisionApplied,
    after_revision_reviews: afterRevision,
    after_revision_final: afterFinal,
    review_job_id: review.id,
  });

  // Sync quality-report for content article if present
  const reportPath = resolvePath("content", "articles", slug, "quality-report.json");
  if (fs.existsSync(path.dirname(reportPath))) {
    const editorial = (afterFinal?.editorial_score ?? score) as Record<string, unknown>;
    writeJson(reportPath, {
      slug,
      title,
      editorial_score: editorial,
      multi_reviews: afterRevision ?? skillResults,
      final_review: (editorial as { final_review?: unknown }).final_review,
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
        "multi-review",
        "final-editorial-review",
        "human-review",
      ],
    });
  }

  console.log("\nReview job ready:", review.id);
  console.log("Open: /os/review/" + review.id);
  console.log(`Artifacts: assets/${slug}/reviews/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
