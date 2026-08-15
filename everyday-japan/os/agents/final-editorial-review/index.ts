import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";
import {
  buildEditorialScoreFromReviews,
  loadSkillReviews,
  synthesizeFinalReview,
} from "../_review";

/**
 * Aggregates Multi Review skill results.
 * Does NOT use a plain average — originality / cultural risk / reader experience can veto.
 */
const agent = defineAgent({
  manifest: manifestOrStub("final-editorial-review", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(
      agent.manifest.prompt ?? "editorial/prompts/os/final-editorial-review.md"
    );
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const draftRel = String(input.draft_path ?? path.join("assets", slug, "draft.md"));
    const revisionRound = Number(input.revision_round ?? 0);
    const maxRevisions = 2;

    const reviews = loadSkillReviews(slug);
    const final = synthesizeFinalReview(reviews, revisionRound);
    final.prompt_version = prompt.version;

    const score = buildEditorialScoreFromReviews(reviews, final);
    score.prompt_version = prompt.version;

    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    ensureDir(path.join(dir, "reviews"));
    const scorePath = path.join(dir, "editorial-score.json");
    const finalPath = path.join(dir, "reviews", "final-editorial.json");
    writeJson(scorePath, { ...score, slug, title, mock: true });
    writeJson(finalPath, { ...final, slug, title, mock: true, skill_count: reviews.length });

    const basePayload = {
      slug,
      title,
      draft_path: draftRel,
      fact_check_path: input.fact_check_path,
      writing_parent_id: input.writing_parent_id,
      quality_parent_id: input.quality_parent_id,
      editorial_score_path: path.relative(resolvePath(), scorePath),
      editorial_score: score,
      final_review_path: path.relative(resolvePath(), finalPath),
      revision_round: revisionRound,
      quality_score: score.overall,
    };

    // Automatic revision loop: revise → revision agent → re-review (max 2)
    if (final.status === "revise" && revisionRound < maxRevisions) {
      return {
        ok: true,
        output: {
          ...basePayload,
          status: final.status,
          overall_score: final.overall_score,
          next: "revision",
        },
        artifacts: [
          { kind: "editorial_score", path: path.relative(resolvePath(), scorePath) },
          { kind: "final_editorial_review", path: path.relative(resolvePath(), finalPath) },
        ],
        enqueue: [
          {
            type: "quality",
            agent_id: "revision",
            payload: {
              ...basePayload,
              priority_revisions: final.priority_revisions,
              multi_reviews: reviews,
            },
            estimated_cost: 0.02,
            idempotency_key: `revision:${slug}:r${revisionRound}`,
            priority: 88,
          },
        ],
        prompt_versions: { "final-editorial-review": prompt.version },
        cost: { actual_cost: 0.012, tokens: 700, duration_ms: 120 },
        quality_score: score.overall,
      };
    }

    // pass, fail, or revise after max rounds → human review (preserve publish gate)
    return {
      ok: true,
      output: {
        ...basePayload,
        status: final.status,
        overall_score: final.overall_score,
        next: "human_review",
      },
      artifacts: [
        { kind: "editorial_score", path: path.relative(resolvePath(), scorePath) },
        { kind: "final_editorial_review", path: path.relative(resolvePath(), finalPath) },
      ],
      enqueue: [
        {
          type: "review",
          agent_id: "publish",
          payload: {
            ...basePayload,
            gate: "human_review",
            publish_recommendation: final.publish_recommendation,
            priority_revisions: final.priority_revisions,
          },
          estimated_cost: 0,
          idempotency_key: `review:${slug}`,
          priority: 90,
        },
      ],
      prompt_versions: { "final-editorial-review": prompt.version },
      cost: { actual_cost: 0.012, tokens: 700, duration_ms: 120 },
      quality_score: score.overall,
    };
  },
});

export default agent;
