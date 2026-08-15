import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";
import fs from "node:fs";

const agent = defineAgent({
  manifest: manifestOrStub("draft", { queue: "writing" }),
  async run(ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/draft.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);

    const draftMd = `---
title: "${title}"
slug: "${slug}"
status: draft
mock: true
---

# ${title}

**Category:** Everyday Japan

---

Many visitors to Japan notice one unusual thing.

${title.replace(/^Why\s+/i, "").replace(/\?$/, "")}.

At first it can look like a simple habit.

But the meaning is often different from what visitors expect.

Understanding it helps readers see everyday Japanese life more clearly.

---

## What Feels Different?

The question is not only what happens — but why it feels natural locally.

## How Japanese People Experience This

For many Japanese people, this is not a cultural performance.

It is something absorbed through ordinary life — at home, at school, and in public spaces.

Growing up in Japan, children often learn the habit by watching adults around them rather than through a formal lesson.

## Cultural Background

History, society, and lifestyle conditions reinforce the pattern.

## Real-life Examples

Small scenes from stations, neighborhoods, and workplaces.

## Visitor Tips

Observe first. Follow local cues. Avoid making the behavior about yourself.

## FAQ

### Is this the same everywhere in Japan?

No. Urban and regional patterns can differ.

### Should visitors copy locals exactly?

Aim for respect and awareness, not perfection.

## Closing Insight

The interesting gap is between what visitors find surprising and what locals find ordinary.
`;

    const draftPath = path.join(dir, "draft.md");
    fs.writeFileSync(draftPath, draftMd);

    const parentId = String(input.writing_parent_id ?? ctx.job.parent_id ?? "");

    const childPayload = {
      slug,
      title,
      draft_path: path.relative(resolvePath(), draftPath),
      writing_parent_id: parentId,
      draft_job_id: ctx.job.id,
    };

    return {
      ok: true,
      output: { slug, title, draft_path: childPayload.draft_path, word_count_estimate: 450 },
      artifacts: [{ kind: "draft", path: childPayload.draft_path }],
      enqueue: [
        {
          type: "writing",
          agent_id: "introduction",
          parent_id: parentId || undefined,
          payload: childPayload,
          estimated_cost: 0.03,
          idempotency_key: `introduction:${slug}`,
        },
      ],
      prompt_versions: { draft: prompt.version },
      cost: { actual_cost: 0.12, tokens: 8000, duration_ms: 1500 },
      quality_score: 72,
    };
  },
});

export default agent;
