import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";

/**
 * Editorial quality gate — delegates to Article Review Agent (full flow in one job).
 */
const agent = defineAgent({
  manifest: manifestOrStub("editorial-quality", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(
      agent.manifest.prompt ?? "editorial/prompts/os/editorial-quality.md"
    );
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);

    return {
      ok: true,
      output: {
        role: "parent",
        slug,
        title,
        next: "article-review",
        status: "delegated_to_article_review",
      },
      enqueue: [
        {
          type: "quality",
          agent_id: "article-review",
          payload: {
            slug,
            title,
            draft_path: input.draft_path,
            fact_check_path: input.fact_check_path,
            writing_parent_id: input.writing_parent_id,
            revision_round: input.revision_round ?? 0,
          },
          estimated_cost: 0.08,
          idempotency_key: `article-review:${slug}`,
          priority: 85,
        },
      ],
      prompt_versions: { "editorial-quality": prompt.version },
      cost: { actual_cost: 0.001, tokens: 50, duration_ms: 20 },
      quality_score: 50,
    };
  },
});

export default agent;
