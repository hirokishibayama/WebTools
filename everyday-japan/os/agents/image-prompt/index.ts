import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";

const agent = defineAgent({
  manifest: manifestOrStub("image-prompt", { queue: "media" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/image-prompt.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const imagesPath = path.join(dir, "image-prompts.json");
    writeJson(imagesPath, {
      hero: `Documentary photo of everyday Japan related to: ${title}. Natural light, no text overlay, realistic street or interior scene.`,
      sections: [
        `Close-up detail illustrating a local daily habit for: ${title}`,
        `Wide environmental context for: ${title}`,
      ],
      ogp: `Clean editorial OGP image for Everyday Japan article: ${title}. 1200x630, restrained palette, no clickbait.`,
      mock: true,
    });

    return {
      ok: true,
      output: {
        slug,
        image_prompts_path: path.relative(resolvePath(), imagesPath),
        writing_parent_id: String(input.writing_parent_id ?? ""),
        draft_path: input.draft_path,
      },
      artifacts: [{ kind: "image_prompts", path: path.relative(resolvePath(), imagesPath) }],
      prompt_versions: { "image-prompt": prompt.version },
      cost: { actual_cost: 0.015, tokens: 900, duration_ms: 200 },
      quality_score: 70,
      enqueue: [],
    };
  },
});

export default agent;
