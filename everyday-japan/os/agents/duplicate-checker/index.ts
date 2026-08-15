import fs from "node:fs";
import path from "node:path";
import type { AgentResult, DuplicateReport } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { readJson, resolvePath, slugify } from "../../store/fs";

function listPublished(): { slug: string; title: string }[] {
  const dir = resolvePath("articles");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => {
      const slug = f.replace(/\.(md|mdx)$/, "");
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      const titleMatch = body.match(/^title:\s*"?([^"\n]+)"?/m) || body.match(/^#\s+(.+)$/m);
      return { slug, title: titleMatch?.[1]?.trim() ?? slug };
    });
}

function similarity(a: string, b: string): number {
  const ta = new Set(slugify(a).split("-").filter(Boolean));
  const tb = new Set(slugify(b).split("-").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / new Set([...ta, ...tb]).size;
}

const agent = defineAgent({
  manifest: manifestOrStub("duplicate-checker", { queue: "topic" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/duplicate-checker.md");
    const policy = readJson<{ duplicate: { blockAbove: number; mergeAdviseAbove: number } }>(
      resolvePath("os/policies/pipeline.json"),
      { duplicate: { blockAbove: 0.85, mergeAdviseAbove: 0.7 } }
    );
    const title = String(input.title ?? "");
    const slug = String(input.slug ?? slugify(title));
    const published = listPublished();
    const similar = published
      .map((p) => ({ ...p, similarity: similarity(title, p.title) }))
      .filter((p) => p.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const max_similarity = similar[0]?.similarity ?? 0;
    let recommendation: DuplicateReport["recommendation"] = "publish";
    if (max_similarity >= policy.duplicate.blockAbove) recommendation = "kill";
    else if (max_similarity >= policy.duplicate.mergeAdviseAbove) recommendation = "merge";

    const report: DuplicateReport = { similar, max_similarity, recommendation };

    const enqueue =
      recommendation === "kill"
        ? []
        : [
            {
              type: "research" as const,
              agent_id: "research" as const,
              payload: {
                title,
                slug,
                total_score: input.total_score,
                duplicate: report,
                merge_suggested: recommendation === "merge",
              },
              priority: Number(input.total_score ?? 50),
              estimated_cost: 0.05,
              idempotency_key: `research:${slug}`,
            },
          ];

    return {
      ok: true,
      output: { ...report, title, slug },
      enqueue,
      prompt_versions: { "duplicate-checker": prompt.version },
      cost: { actual_cost: 0.001, tokens: 200, duration_ms: 40 },
      quality_score: recommendation === "kill" ? 20 : recommendation === "merge" ? 60 : 85,
    };
  },
});

export default agent;
