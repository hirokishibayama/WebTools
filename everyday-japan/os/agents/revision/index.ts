import fs from "node:fs";
import path from "node:path";
import type { AgentResult, SkillReviewResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, isoNow, resolvePath, writeJson } from "../../store/fs";
import { enqueueMultiReviewChildren, readArticleText } from "../_review";

/**
 * Applies safe, non-factual rewrites based on Multi Review issues.
 * Never invents new facts. Softens or removes unsupported claims.
 */
const agent = defineAgent({
  manifest: manifestOrStub("revision", { queue: "quality" }),
  async run(ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/revision.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const draftRel = String(input.draft_path ?? path.join("assets", slug, "draft.md"));
    const revisionRound = Number(input.revision_round ?? 0);
    const nextRound = revisionRound + 1;

    let text = readArticleText(slug, draftRel);
    const before = text;
    const applied: string[] = [];

    // Soften absolute national claims — never touch "not every / not all"
    text = text.replace(
      /(?<!\b[Nn]ot )(?<!\b[Nn]ot all )\b(all Japanese people|every Japanese person|Japanese people always)\b/g,
      (m) => {
        applied.push(`Softened absolute claim: "${m}"`);
        return "many Japanese people";
      }
    );

    // Soften AI clichés only
    const clicheMap: [RegExp, string, string][] = [
      [/\bAt first glance,\s*/gi, "", "Removed 'At first glance'"],
      [/\bIt may seem strange, but\s*/gi, "", "Removed 'It may seem strange, but'"],
      [/\bIn many ways,\s*/gi, "", "Removed 'In many ways'"],
      [/\bFor visitors, this can be surprising\.\s*/gi, "", "Removed stock visitor-surprise line"],
      [
        /\bThis unique aspect of Japanese culture\s*/gi,
        "This habit ",
        "Rewrote unique-culture stock phrase",
      ],
      [
        /\bJapan is a country where\s*/gi,
        "In everyday Japanese life, ",
        "Removed 'Japan is a country where'",
      ],
    ];
    for (const [re, replacement, note] of clicheMap) {
      if (re.test(text)) {
        text = text.replace(re, replacement);
        applied.push(note);
      }
    }

    // Soften unsupported research allusions when Fact review flagged them
    const reviews = (input.multi_reviews as SkillReviewResult[] | undefined) ?? [];
    const fact = reviews.find((r) => r.reviewer === "fact-source");
    const needsResearchSoftening =
      !!fact &&
      (fact.needs_source?.some((s) => /studies|researchers/i.test(s)) ||
        fact.issues.some((i) => /research/i.test(i.problem)));

    if (needsResearchSoftening) {
      const replacements: [RegExp, string, string][] = [
        [
          /Studies of Japanese interaction have described/gi,
          "Observers of Japanese interaction often describe",
          "Softened unsourced 'studies have described' claim",
        ],
        [
          /Japanese researchers have examined/gi,
          "Observers of Japanese language use have noted",
          "Softened unsourced 'Japanese researchers have examined' claim",
        ],
        [
          /researchers have examined/gi,
          "observers have noted",
          "Softened unsourced 'researchers have examined' claim",
        ],
      ];
      for (const [re, replacement, note] of replacements) {
        if (re.test(text)) {
          text = text.replace(re, replacement);
          applied.push(note);
        }
      }
      if (/\bit is said that\b/i.test(text)) {
        text = text.replace(/\bit is said that\b/gi, "some people say that");
        applied.push("Softened hearsay 'it is said that'");
      }
    }

    // Never invent FAQ content
    if (!/## FAQ/i.test(text) && /FAQ/i.test(JSON.stringify(input.priority_revisions ?? []))) {
      applied.push("Skipped auto-adding FAQ (would invent content); flagged for human/editor");
    }

    const dir = resolvePath("assets", slug);
    ensureDir(dir);
    const draftPath = resolvePath(draftRel);
    ensureDir(path.dirname(draftPath));
    if (text !== before) {
      fs.writeFileSync(draftPath, text, "utf8");
    } else if (!fs.existsSync(draftPath)) {
      fs.writeFileSync(draftPath, text, "utf8");
    }

    const reportPath = path.join(dir, "reviews", `revision-r${nextRound}.json`);
    ensureDir(path.dirname(reportPath));
    writeJson(reportPath, {
      slug,
      title,
      revision_round: nextRound,
      applied,
      unchanged: text === before,
      at: isoNow(),
      mock: true,
    });

    const qualityParent = String(input.quality_parent_id ?? ctx.job.parent_id ?? ctx.job.id);
    const childPayload = {
      slug,
      title,
      draft_path: draftRel,
      fact_check_path: input.fact_check_path,
      writing_parent_id: input.writing_parent_id,
      quality_parent_id: qualityParent,
      revision_round: nextRound,
    };

    return {
      ok: true,
      output: {
        slug,
        title,
        revision_round: nextRound,
        applied,
        draft_path: draftRel,
        revision_path: path.relative(resolvePath(), reportPath),
        next: "multi_review_rerun",
      },
      artifacts: [{ kind: "revision", path: path.relative(resolvePath(), reportPath) }],
      enqueue: enqueueMultiReviewChildren(childPayload),
      prompt_versions: { revision: prompt.version },
      cost: { actual_cost: 0.02, tokens: 1200, duration_ms: 200 },
      quality_score: Number(input.quality_score ?? 0),
    };
  },
});

export default agent;
