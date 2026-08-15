import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-fact-source", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-fact-source",
      reviewer: "fact-source",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-fact-source.md",
      input,
    });
  },
});

export default agent;
