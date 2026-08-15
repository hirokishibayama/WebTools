import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";

const agent = defineAgent({
  manifest: manifestOrStub("outline", { queue: "outline" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/outline.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const outlinePath = path.join(dir, "outline.json");
    writeJson(outlinePath, {
      title,
      slug,
      sections: [
        "Hook",
        "The Question",
        "Local Perspective",
        "Cultural Background",
        "Real-life Examples",
        "Visitor Tips",
        "FAQ",
        "Closing Insight",
      ],
      mock: true,
    });

    return {
      ok: true,
      output: { slug, title, outline_path: path.relative(resolvePath(), outlinePath) },
      artifacts: [{ kind: "outline", path: path.relative(resolvePath(), outlinePath) }],
      enqueue: [
        {
          type: "writing",
          agent_id: "writing",
          payload: {
            slug,
            title,
            research_path: input.research_path,
            outline_path: path.relative(resolvePath(), outlinePath),
          },
          estimated_cost: 0.02,
          idempotency_key: `writing-parent:${slug}`,
        },
      ],
      prompt_versions: { outline: prompt.version },
      cost: { actual_cost: 0.02, tokens: 1800, duration_ms: 400 },
      quality_score: 78,
    };
  },
});

export default agent;
