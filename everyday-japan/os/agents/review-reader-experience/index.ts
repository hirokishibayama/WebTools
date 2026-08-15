import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-reader-experience", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-reader-experience",
      reviewer: "reader-experience",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-reader-experience.md",
      input,
    });
  },
});

export default agent;
