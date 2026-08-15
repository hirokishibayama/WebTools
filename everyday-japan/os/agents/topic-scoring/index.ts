import path from "node:path";
import type { AgentResult, ScoredTopic, ScoringWeights } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { readJson, resolvePath, writeJson, slugify } from "../../store/fs";

function loadWeights(): ScoringWeights {
  const base = readJson<ScoringWeights>(resolvePath("os/policies/scoring.json"), {
    foreign_interest: 0.25,
    seo: 0.2,
    originality: 0.2,
    evergreen: 0.2,
    japaneseness: 0.15,
  });
  const feedback = readJson<{ weights?: ScoringWeights }>(
    resolvePath("data/feedback/scoring-weights.json"),
    {}
  );
  return feedback.weights ?? base;
}

function pseudoScore(title: string, weights: ScoringWeights): ScoredTopic {
  // Deterministic mock scores from title hash — stable across runs
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  const n = (offset: number) => 55 + ((h >>> offset) % 41); // 55–95
  const scores = {
    foreign_interest: n(0),
    seo: n(5),
    originality: n(10),
    evergreen: n(15),
    japaneseness: n(20),
  };
  const total = Math.round(
    scores.foreign_interest * weights.foreign_interest +
      scores.seo * weights.seo +
      scores.originality * weights.originality +
      scores.evergreen * weights.evergreen +
      scores.japaneseness * weights.japaneseness
  );
  return {
    id: "",
    title,
    seed_source: "",
    scores,
    total,
  };
}

const agent = defineAgent({
  manifest: manifestOrStub("topic-scoring", { queue: "topic" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/topic-scoring.md");
    const policy = readJson<{ topic: { topN: number; minScore: number } }>(
      resolvePath("os/policies/pipeline.json"),
      { topic: { topN: 10, minScore: 70 } }
    );
    const batchPath = String(input.batch_path ?? "");
    const batch = readJson<{ candidates: { id: string; title: string; seed_source: string }[] }>(
      resolvePath(batchPath),
      { candidates: [] }
    );
    const weights = loadWeights();
    const scored: ScoredTopic[] = batch.candidates.map((c) => {
      const s = pseudoScore(c.title, weights);
      return { ...s, id: c.id, title: c.title, seed_source: c.seed_source };
    });
    scored.sort((a, b) => b.total - a.total);

    const top = scored.filter((s) => s.total >= policy.topic.minScore).slice(0, policy.topic.topN);
    const outPath = resolvePath("data/index/scored", `scored_${Date.now()}.json`);
    writeJson(outPath, { weights, top, scored_count: scored.length });

    const enqueue = top.map((t) => ({
      type: "topic" as const,
      agent_id: "duplicate-checker" as const,
      payload: {
        title: t.title,
        slug: slugify(t.title),
        scores: t.scores,
        total_score: t.total,
        candidate_id: t.id,
      },
      priority: t.total,
      estimated_cost: 0.005,
      idempotency_key: `dup:${slugify(t.title)}`,
    }));

    return {
      ok: true,
      output: {
        scored_count: scored.length,
        top_count: top.length,
        top: top.map((t) => ({ title: t.title, total: t.total })),
        scored_path: path.relative(resolvePath(), outPath),
      },
      artifacts: [{ kind: "scored_topics", path: path.relative(resolvePath(), outPath) }],
      enqueue,
      prompt_versions: { "topic-scoring": prompt.version },
      cost: { actual_cost: 0.01, tokens: 2000, duration_ms: 200 },
      quality_score: top[0]?.total ?? 0,
      metrics: { top: top.length },
    };
  },
});

export default agent;
