import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-seo-intent", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-seo-intent",
      reviewer: "seo-search-intent",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-seo-intent.md",
      input,
    });
  },
});

export default agent;
