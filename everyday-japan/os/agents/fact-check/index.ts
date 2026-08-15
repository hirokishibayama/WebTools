import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";

const agent = defineAgent({
  manifest: manifestOrStub("fact-check", { queue: "fact-check" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/fact-check.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const reportPath = path.join(dir, "fact-check.json");
    const quality = 82;
    writeJson(reportPath, {
      verdict: "pass",
      quality_score: quality,
      verified_facts: ["Local perspective framing is plausible (mock)."],
      needs_citation: ["Any absolute national claim should be softened."],
      bias: [],
      outdated: [],
      unsupported: [],
      mock: true,
    });

    return {
      ok: true,
      output: {
        slug,
        title,
        verdict: "pass",
        fact_check_path: path.relative(resolvePath(), reportPath),
        draft_path: input.draft_path,
      },
      artifacts: [{ kind: "fact_check", path: path.relative(resolvePath(), reportPath) }],
      enqueue: [
        {
          type: "quality",
          agent_id: "editorial-quality",
          payload: {
            slug,
            title,
            draft_path: input.draft_path,
            fact_check_path: path.relative(resolvePath(), reportPath),
            writing_parent_id: input.writing_parent_id,
          },
          estimated_cost: 0.015,
          idempotency_key: `editorial-quality:${slug}`,
          priority: 85,
        },
      ],
      prompt_versions: { "fact-check": prompt.version },
      cost: { actual_cost: 0.03, tokens: 2500, duration_ms: 600 },
      quality_score: quality,
    };
  },
});

export default agent;
