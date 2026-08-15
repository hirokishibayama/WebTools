import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson, slugify } from "../../store/fs";

const agent = defineAgent({
  manifest: manifestOrStub("seo", { queue: "seo" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/seo.md");
    const slug = String(input.slug ?? slugify(String(input.title ?? "untitled")));
    const title = String(input.title ?? slug);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const seoPath = path.join(dir, "seo.json");
    writeJson(seoPath, {
      seo_title: title.slice(0, 60),
      meta_description: `Understand why: ${title}. A calm Everyday Japan explainer for first-time visitors.`.slice(
        0,
        155
      ),
      slug,
      tags: ["everyday-japan", "culture", "travelers"],
      mock: true,
    });

    return {
      ok: true,
      output: { slug, seo_path: path.relative(resolvePath(), seoPath) },
      artifacts: [{ kind: "seo", path: path.relative(resolvePath(), seoPath) }],
      prompt_versions: { seo: prompt.version },
      cost: { actual_cost: 0.01, tokens: 700, duration_ms: 150 },
      quality_score: 74,
      enqueue: [],
    };
  },
});

export default agent;
