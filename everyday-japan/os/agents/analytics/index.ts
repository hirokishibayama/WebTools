import type { AgentResult, AnalyticsFeedback, ScoringWeights } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { readJson, resolvePath, writeJson, isoNow } from "../../store/fs";
import fs from "node:fs";

/**
 * Analytics Agent — mock GSC/GA4 today.
 * Writes feedback that Topic Scoring reads on the next run (self-improvement loop).
 */
const agent = defineAgent({
  manifest: manifestOrStub("analytics", { queue: "analytics" }),
  async run(_ctx): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/analytics.md");
    const articlesDir = resolvePath("articles");
    const slugs = fs.existsSync(articlesDir)
      ? fs.readdirSync(articlesDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [];

    const report = {
      generated_at: isoNow(),
      source: "mock",
      articles: slugs.map((slug, i) => ({
        slug,
        impressions: 1000 + i * 137,
        clicks: 40 + i * 9,
        ctr: 0.04,
        avg_position: 8 + (i % 5),
      })),
    };
    writeJson(resolvePath("data/analytics/latest.json"), report);

    const base = readJson<ScoringWeights>(resolvePath("os/policies/scoring.json"), {
      foreign_interest: 0.25,
      seo: 0.2,
      originality: 0.2,
      evergreen: 0.2,
      japaneseness: 0.15,
    });

    // Mock feedback: boost evergreen slightly when mock CTR is healthy
    const avgCtr =
      report.articles.length === 0
        ? 0.03
        : report.articles.reduce((s, a) => s + a.ctr, 0) / report.articles.length;

    const weights: ScoringWeights = {
      ...base,
      evergreen: avgCtr >= 0.03 ? Math.min(0.28, base.evergreen + 0.03) : base.evergreen,
      seo: avgCtr < 0.02 ? Math.min(0.3, base.seo + 0.05) : base.seo,
    };

    // renormalize
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    (Object.keys(weights) as (keyof ScoringWeights)[]).forEach((k) => {
      weights[k] = Number((weights[k] / sum).toFixed(4));
    });

    const feedback: AnalyticsFeedback = {
      updated_at: isoNow(),
      weights,
      signals: {
        high_performing_keywords: ["convenience store", "trains quiet", "sumimasen"],
        low_performing_patterns: ["top 10", "best of japan"],
        notes:
          "Mock feedback loop: Analytics adjusts Topic Scoring weights for the next discovery cycle.",
      },
    };

    writeJson(resolvePath("data/feedback/scoring-weights.json"), feedback);
    writeJson(resolvePath("data/feedback/latest.json"), feedback);

    return {
      ok: true,
      output: {
        articles_measured: slugs.length,
        feedback_path: "data/feedback/scoring-weights.json",
        weights,
      },
      artifacts: [
        { kind: "analytics", path: "data/analytics/latest.json" },
        { kind: "scoring_feedback", path: "data/feedback/scoring-weights.json" },
      ],
      prompt_versions: { analytics: prompt.version },
      cost: { actual_cost: 0.005, tokens: 400, duration_ms: 80 },
      quality_score: 70,
      metrics: { articles: slugs.length },
    };
  },
});

export default agent;
