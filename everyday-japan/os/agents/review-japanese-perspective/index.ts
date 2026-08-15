import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-japanese-perspective", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-japanese-perspective",
      reviewer: "japanese-perspective",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-japanese-perspective.md",
      input,
    });
  },
});

export default agent;
