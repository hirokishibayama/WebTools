import type { Agent, AgentContext, AgentResult } from "../../types";
import { loadPrompt } from "../prompt";
import { getManifest } from "../load";
import { writeJson, resolvePath, ensureDir, slugify } from "../../store/fs";
import path from "node:path";

const MOCK_SEEDS = [
  "Why are Japanese trains so quiet?",
  "Why do Japanese schools clean classrooms?",
  "Why are Japanese convenience stores famous?",
  "Why do Japanese people say sumimasen so often?",
  "Why are there vending machines everywhere in Japan?",
  "Why are Japanese streets so clean?",
  "Why do Japanese homes remove shoes indoors?",
  "Why is tipping uncommon in Japan?",
  "Why do Japanese offices stamp documents with hanko?",
  "Why are Japanese toilets so advanced?",
  "Why do Japanese people bow instead of shaking hands?",
  "Why is cash still common in Japan?",
  "Why do Japanese cities have so many small restaurants?",
  "Why are Japanese hotels so small?",
  "Why do Japanese people eat rice almost every day?",
  "Why are Japanese parks so orderly?",
  "Why do Japanese trains announce every stop so carefully?",
  "Why is silence valued in Japanese public spaces?",
  "Why do Japanese apartments feel compact?",
  "Why are Japanese work lunches often short?",
];

function expandTo100(): { id: string; title: string; seed_source: string }[] {
  const out = [];
  for (let i = 0; i < 100; i++) {
    const base = MOCK_SEEDS[i % MOCK_SEEDS.length];
    const title = i < MOCK_SEEDS.length ? base : `${base} (${Math.floor(i / MOCK_SEEDS.length) + 1})`;
    out.push({
      id: `cand_${String(i + 1).padStart(3, "0")}`,
      title,
      seed_source: i % 3 === 0 ? "mock:reddit" : i % 3 === 1 ? "mock:trends" : "mock:forums",
    });
  }
  return out;
}

const agent: Agent = {
  manifest: getManifest("trend-discovery"),
  async run(_ctx: AgentContext): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt!);
    const candidates = expandTo100();
    const outPath = resolvePath("data/index/candidates", `batch_${Date.now()}.json`);
    ensureDir(path.dirname(outPath));
    writeJson(outPath, {
      generated_at: new Date().toISOString(),
      count: candidates.length,
      candidates,
    });
    // latest pointer
    writeJson(resolvePath("data/index/candidates/latest.json"), {
      path: path.relative(resolvePath(), outPath),
      count: candidates.length,
      generated_at: new Date().toISOString(),
    });

    return {
      ok: true,
      output: { candidate_count: candidates.length, batch_path: path.relative(resolvePath(), outPath) },
      artifacts: [{ kind: "candidate_topics", path: path.relative(resolvePath(), outPath) }],
      enqueue: [
        {
          type: "topic",
          agent_id: "topic-scoring",
          payload: { batch_path: path.relative(resolvePath(), outPath) },
          dependencies: [], // will be set by worker to this job id
          priority: 80,
          estimated_cost: 0.01,
          idempotency_key: `score:${slugify(path.basename(outPath, ".json"))}`,
        },
      ],
      prompt_versions: { "trend-discovery": prompt.version },
      cost: { actual_cost: 0.002, tokens: 500, duration_ms: 120 },
      quality_score: 80,
      metrics: { candidates: candidates.length },
    };
  },
};

export default agent;
