import type { FactoryMetrics } from "../types";
import { countByQueueStatus, listJobs } from "../store/jobs";
import { isoNow, resolvePath, writeJson } from "../store/fs";
import fs from "node:fs";

export function recomputeMetrics(): FactoryMetrics {
  const by_queue = countByQueueStatus();
  const all = listJobs();

  const sumStatus = (type: string, statuses: string[]) =>
    statuses.reduce((n, s) => n + (by_queue[type]?.[s] ?? 0), 0);

  const articlesDir = resolvePath("articles");
  const published = fs.existsSync(articlesDir)
    ? fs.readdirSync(articlesDir).filter((f) => f.endsWith(".md") || f.endsWith(".mdx")).length
    : 0;

  const latestCandidates = resolvePath("data/index/candidates/latest.json");
  let topics_candidates = 0;
  if (fs.existsSync(latestCandidates)) {
    const latest = JSON.parse(fs.readFileSync(latestCandidates, "utf8")) as { count?: number };
    topics_candidates = latest.count ?? 0;
  }

  const metrics: FactoryMetrics = {
    updated_at: isoNow(),
    topics_candidates,
    topic_queued: sumStatus("topic", ["pending", "ready", "running"]),
    research: sumStatus("research", ["pending", "ready", "running", "succeeded"]),
    outline: sumStatus("outline", ["pending", "ready", "running", "succeeded"]),
    writing: all.filter(
      (j) =>
        (j.type === "writing" || j.agent_id === "draft") &&
        ["pending", "ready", "running"].includes(j.status)
    ).length,
    review_waiting: listJobs({ type: "review", status: "needs_human" }).length,
    published,
    errors: sumStatus("_failed", ["dead"]) + all.filter((j) => j.status === "dead").length,
    by_queue,
  };

  writeJson(resolvePath("data/metrics/latest.json"), metrics);
  return metrics;
}
