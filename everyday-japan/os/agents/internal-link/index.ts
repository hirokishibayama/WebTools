import fs from "node:fs";
import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson, slugify } from "../../store/fs";

function publishedArticles(): { slug: string; title: string }[] {
  const dir = resolvePath("articles");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => {
      const slug = f.replace(/\.(md|mdx)$/, "");
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      const m = body.match(/^title:\s*"?([^"\n]+)"?/m) || body.match(/^#\s+(.+)$/m);
      return { slug, title: m?.[1]?.trim() ?? slug };
    });
}

const agent = defineAgent({
  manifest: manifestOrStub("internal-link", { queue: "seo" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/internal-link.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const related = publishedArticles()
      .filter((a) => a.slug !== slug)
      .slice(0, 5)
      .map((a) => ({
        target_slug: a.slug,
        target_title: a.title,
        anchor_text: a.title.replace(/^Why\s+/i, "").slice(0, 48),
      }));

    // If no published articles yet, suggest future placeholders
    if (related.length === 0) {
      related.push({
        target_slug: "why-japanese-convenience-stores-are-different",
        target_title: "Why Japanese Convenience Stores Are So Different",
        anchor_text: "Japanese convenience stores",
      });
    }

    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const linksPath = path.join(dir, "internal-links.json");
    writeJson(linksPath, { slug, title, related, mock: true });

    return {
      ok: true,
      output: { slug, links_path: path.relative(resolvePath(), linksPath), related },
      artifacts: [{ kind: "internal_links", path: path.relative(resolvePath(), linksPath) }],
      prompt_versions: { "internal-link": prompt.version },
      cost: { actual_cost: 0.008, tokens: 600, duration_ms: 100 },
      quality_score: 70,
      enqueue: [],
    };
  },
});

export default agent;
