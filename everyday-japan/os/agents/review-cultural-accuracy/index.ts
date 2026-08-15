import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-cultural-accuracy", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-cultural-accuracy",
      reviewer: "cultural-accuracy",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-cultural-accuracy.md",
      input,
    });
  },
});

export default agent;
