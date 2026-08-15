import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { readJson, resolvePath } from "../../store/fs";

/**
 * Writing parent orchestrator.
 * Spawns child jobs: draft → (image-prompt, seo, internal-link) then fact-check waits on children.
 */
const agent = defineAgent({
  manifest: manifestOrStub("writing", { queue: "writing" }),
  async run(ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/writing.md");
    const policy = readJson<{ writing: { childAgents: string[] } }>(
      resolvePath("os/policies/pipeline.json"),
      { writing: { childAgents: ["draft", "image-prompt", "seo", "internal-link"] } }
    );
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);

    // Parent only enqueues draft first; draft will enqueue siblings.
    // Parent stays "running" until children complete — worker marks parent succeeded
    // when a dedicated reconcile step runs, OR draft enqueue includes parent wait.
    // Simpler mock: parent enqueues draft with parent_id; draft enqueues media/seo/links;
    // fact-check depends on all child job ids collected in payload.

    return {
      ok: true,
      output: {
        role: "parent",
        slug,
        title,
        child_agents: policy.writing.childAgents,
        status: "children_spawned",
      },
      enqueue: [
        {
          type: "writing",
          agent_id: "draft",
          parent_id: ctx.job.id,
          payload: {
            slug,
            title,
            research_path: input.research_path,
            outline_path: input.outline_path,
            writing_parent_id: ctx.job.id,
          },
          estimated_cost: 0.15,
          idempotency_key: `draft:${slug}`,
        },
      ],
      prompt_versions: { writing: prompt.version },
      cost: { actual_cost: 0.001, tokens: 100, duration_ms: 30 },
      quality_score: 50,
    };
  },
});

export default agent;
