import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";

const agent = defineAgent({
  manifest: manifestOrStub("research", { queue: "research" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/research.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const researchPath = path.join(dir, "research.json");
    writeJson(researchPath, {
      title,
      slug,
      mock: true,
      facts: [
        "This behavior is widely observed in urban Japan.",
        "Social norms and infrastructure reinforce each other.",
      ],
      misconceptions: ["It is enforced only by strict laws."],
      historical_background: ["Post-war urban growth shaped daily routines."],
      visitor_advice: ["Observe quietly and follow local cues."],
      needs_verification: ["Regional variation outside major cities."],
    });

    return {
      ok: true,
      output: { slug, title, research_path: path.relative(resolvePath(), researchPath) },
      artifacts: [{ kind: "research", path: path.relative(resolvePath(), researchPath) }],
      enqueue: [
        {
          type: "outline",
          agent_id: "outline",
          payload: { slug, title, research_path: path.relative(resolvePath(), researchPath) },
          estimated_cost: 0.03,
          idempotency_key: `outline:${slug}`,
        },
      ],
      prompt_versions: { research: prompt.version },
      cost: { actual_cost: 0.04, tokens: 3500, duration_ms: 800 },
      quality_score: 75,
    };
  },
});

export default agent;
