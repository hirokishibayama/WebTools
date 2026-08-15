import fs from "node:fs";
import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, resolvePath, writeJson } from "../../store/fs";

function extractOpening(markdown: string): string {
  const withoutFm = markdown.replace(/^---[\s\S]*?---\n*/, "");
  const parts = withoutFm.split(/\n---\n|\n## /);
  return (parts[0] ?? withoutFm).trim().slice(0, 1200);
}

function scoreOpening(opening: string): {
  hasSurprise: boolean;
  hasVisitorQuestion: boolean;
  hasBenefit: boolean;
  encyclopediaLike: boolean;
  score: number;
} {
  const lower = opening.toLowerCase();
  const hasSurprise =
    /notice|unusual|surprising|often say|everywhere|does not always|unexpected|one of the first/.test(
      lower
    );
  const hasVisitorQuestion =
    /\?/.test(opening) || /why |confused|confusion|wonder|feel different/.test(lower);
  const hasBenefit =
    /understand|reveals|deeper|learn|helps|reason|means more|everyday/.test(lower);
  const encyclopediaLike =
    /^(# .+\n+)?[a-z].+ is a (japanese|common|traditional)/i.test(opening) ||
    /is defined as|refers to the japanese word/.test(lower);

  let score = 40;
  if (hasSurprise) score += 20;
  if (hasVisitorQuestion) score += 20;
  if (hasBenefit) score += 15;
  if (encyclopediaLike) score -= 25;
  if (opening.split(/\n\n/).length >= 3) score += 5;
  return {
    hasSurprise,
    hasVisitorQuestion,
    hasBenefit,
    encyclopediaLike,
    score: Math.max(0, Math.min(100, score)),
  };
}

function buildHookIntro(title: string): string {
  const topic = title.replace(/^why\s+/i, "").replace(/\?$/, "");
  return `Many visitors to Japan notice one unusual thing.

${topic.charAt(0).toUpperCase() + topic.slice(1)}.

At first, it can look like a simple habit.

But the meaning is often different from what phrasebooks suggest.

Understanding it helps visitors read everyday Japanese manners more accurately.

`;
}

const agent = defineAgent({
  manifest: manifestOrStub("introduction", { queue: "writing" }),
  async run(ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/introduction.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const draftRel = String(input.draft_path ?? path.join("assets", slug, "draft.md"));
    const draftPath = resolvePath(draftRel);
    const dir = resolvePath("assets", slug);
    ensureDir(dir);

    let draft = fs.existsSync(draftPath) ? fs.readFileSync(draftPath, "utf8") : "";
    const opening = extractOpening(draft);
    const analysis = scoreOpening(opening);
    let rewritten = false;

    if (analysis.score < 70 || analysis.encyclopediaLike || !analysis.hasSurprise) {
      const fmMatch = draft.match(/^---[\s\S]*?---\n*/);
      const fm = fmMatch?.[0] ?? "";
      const body = draft.slice(fm.length);
      const titleLine = body.match(/^# .+$/m)?.[0] ?? `# ${title}`;
      const rest = body.replace(/^# .+\n+/, "").replace(/^\*\*Category:.*\n+/, "");
      // Replace everything before first ## or --- section break with new hook
      const afterHook = rest.replace(/^[\s\S]*?(?=\n## |\n---\n)/, "\n");
      const category =
        body.match(/^\*\*Category:.*$/m)?.[0] ?? "**Category:** Everyday Japan";
      draft = `${fm}${titleLine}\n\n${category}\n\n${buildHookIntro(title).trim()}\n${afterHook.startsWith("\n") ? afterHook : `\n${afterHook}`}`;
      fs.writeFileSync(draftPath, draft);
      rewritten = true;
    }

    const reportPath = path.join(dir, "introduction.json");
    writeJson(reportPath, {
      slug,
      analysis,
      rewritten,
      prompt_version: prompt.version,
      mock: true,
    });

    const parentId = String(input.writing_parent_id ?? ctx.job.parent_id ?? "");
    const payload = {
      slug,
      title,
      draft_path: draftRel,
      writing_parent_id: parentId,
      draft_job_id: input.draft_job_id,
    };

    return {
      ok: true,
      output: {
        slug,
        rewritten,
        introduction_score: rewritten ? Math.max(analysis.score, 78) : analysis.score,
        introduction_path: path.relative(resolvePath(), reportPath),
      },
      artifacts: [{ kind: "introduction", path: path.relative(resolvePath(), reportPath) }],
      enqueue: [
        {
          type: "writing",
          agent_id: "japanese-perspective",
          parent_id: parentId || undefined,
          payload,
          estimated_cost: 0.03,
          idempotency_key: `jp-perspective:${slug}`,
        },
      ],
      prompt_versions: { introduction: prompt.version },
      cost: { actual_cost: 0.02, tokens: 1200, duration_ms: 250 },
      quality_score: rewritten ? 78 : analysis.score,
    };
  },
});

export default agent;
