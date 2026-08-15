import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { runMultiReviewSkill } from "../_review";

const agent = defineAgent({
  manifest: manifestOrStub("review-editorial-originality", { queue: "quality" }),
  async run(_ctx, input): Promise<AgentResult> {
    return runMultiReviewSkill({
      agentId: "review-editorial-originality",
      reviewer: "editorial-originality",
      promptPath: agent.manifest.prompt ?? "editorial/prompts/os/review-editorial-originality.md",
      input,
    });
  },
});

export default agent;
