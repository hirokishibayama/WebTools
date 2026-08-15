import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-english-naturalness", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-english-naturalness",
      reviewer: "english-naturalness",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-english-naturalness.md",
      input,
    });
  },
});

export default agent;
