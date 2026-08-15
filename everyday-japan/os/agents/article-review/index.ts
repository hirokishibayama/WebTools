import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";
import { MULTI_REVIEW_CHILDREN } from "../_review";
import {
  listPublishedSlugs,
  runArticleReviewFlow,
} from "../../workflows/article-review";

/**
 * Article Review Agent (Layer 2)
 *
 * Orchestrates 7 independent Review Skills into one review_report,
 * then runs the Revision loop and Final Decision (Layer 3 workflow).
 *
 * Conceptually:
 *   Article Review Agent
 *     └── Review Skills × 7
 */
const agent = defineAgent({
  manifest: manifestOrStub("article-review", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(
      agent.manifest.prompt ?? "editorial/prompts/os/article-review.md"
    );
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const draftRel = String(input.draft_path ?? path.join("assets", slug, "draft.md"));

    const flow = await runArticleReviewFlow({
      slug,
      title,
      draft_path: draftRel,
      article: typeof input.article === "string" ? input.article : undefined,
      metadata:
        input.metadata && typeof input.metadata === "object"
          ? (input.metadata as Record<string, unknown>)
          : undefined,
      existing_articles:
        Array.isArray(input.existing_articles)
          ? (input.existing_articles as string[])
          : listPublishedSlugs(),
      max_revision_rounds: Number(input.max_revision_rounds ?? 2),
    });

    const decision = flow.decision;
    const score = flow.editorial_score;
    const scorePath = resolvePath("assets", slug, "editorial-score.json");
    ensureDir(path.dirname(scorePath));
    writeJson(scorePath, { ...score, slug, title, mock: true });

    const reportPath = resolvePath("content", "reviews", slug, "final-review.json");

    // Human gate: PASS can still go to dashboard; FAIL / HUMAN_REVIEW / REVISE always need humans
    const needsHuman =
      decision.status === "HUMAN_REVIEW" ||
      decision.status === "FAIL" ||
      decision.status === "REVISE" ||
      decision.status === "PASS";

    return {
      ok: true,
      output: {
        slug,
        title,
        review_report: decision,
        article_review: decision,
        editorial_score: score,
        editorial_score_path: path.relative(resolvePath(), scorePath),
        final_review_path: path.relative(resolvePath(), reportPath),
        reviews_dir: flow.reviews_dir,
        draft_path: draftRel,
        revision_rounds: flow.revision_rounds,
        child_agents: MULTI_REVIEW_CHILDREN,
        writing_parent_id: input.writing_parent_id,
        fact_check_path: input.fact_check_path,
        quality_score: decision.overall_score,
      },
      artifacts: [
        { kind: "article_review", path: path.relative(resolvePath(), reportPath) },
        { kind: "editorial_score", path: path.relative(resolvePath(), scorePath) },
      ],
      enqueue: needsHuman
        ? [
            {
              type: "review",
              agent_id: "publish",
              payload: {
                slug,
                title,
                draft_path: draftRel,
                fact_check_path: input.fact_check_path,
                writing_parent_id: input.writing_parent_id,
                editorial_score_path: path.relative(resolvePath(), scorePath),
                editorial_score: score,
                article_review: decision,
                quality_score: decision.overall_score,
                gate: "human_review",
                publish_recommendation: decision.final_summary,
                article_review_status: decision.status,
              },
              estimated_cost: 0,
              idempotency_key: `review:${slug}`,
              priority: 90,
            },
          ]
        : [],
      prompt_versions: { "article-review": prompt.version },
      cost: { actual_cost: 0.08, tokens: 5000, duration_ms: 800 },
      quality_score: decision.overall_score,
    };
  },
});

export default agent;
