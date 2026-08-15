import { createJob } from "../store/jobs";
import { isoNow, newId } from "../store/fs";
import { runWorkerLoop } from "../worker/runner";
import { recomputeMetrics } from "../metrics/recompute";

/**
 * Scheduler — CLI today; Cron / GitHub Actions / Cloud Run tomorrow.
 */
export async function runScheduler(opts?: { drain?: boolean; maxJobs?: number }) {
  const runId = newId("sched");

  createJob({
    type: "trend",
    agent_id: "trend-discovery",
    payload: { schedule: "daily", run_id: runId, mock: true },
    priority: 100,
    estimated_cost: 0.02,
    idempotency_key: `trend:${runId}`,
  });

  createJob({
    type: "analytics",
    agent_id: "analytics",
    payload: { schedule: "daily", run_id: runId, mock: true },
    priority: 40,
    estimated_cost: 0.01,
    idempotency_key: `analytics:${runId}`,
  });

  recomputeMetrics();

  if (opts?.drain === false) {
    return { runId, processed: 0, at: isoNow() };
  }

  let total = 0;
  const max = opts?.maxJobs ?? 300;
  for (let i = 0; i < 30 && total < max; i++) {
    const n = await runWorkerLoop({ maxJobs: 30 });
    total += n;
    if (n === 0) break;
  }

  recomputeMetrics();
  return { runId, processed: total, at: isoNow() };
}
