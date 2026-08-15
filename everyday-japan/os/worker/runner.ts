import type { EnqueueRequest, Job, QueueName } from "../types";
import { loadAgent } from "../agents/load";
import {
  createJob,
  getJobById,
  listJobs,
  moveToFailed,
  refreshDependencyGates,
  saveJob,
} from "../store/jobs";
import { isoNow, workspaceRoot } from "../store/fs";
import { recomputeMetrics } from "../metrics/recompute";
import type { AgentId } from "../types";
import { MULTI_REVIEW_CHILDREN } from "../agents/_review";

const WRITING_CHILDREN: AgentId[] = [
  "draft",
  "introduction",
  "japanese-perspective",
  "image-prompt",
  "seo",
  "internal-link",
];

const QUALITY_CHILDREN: AgentId[] = [...MULTI_REVIEW_CHILDREN];
function applyCost(
  job: Job,
  result: {
    cost?: { actual_cost?: number; tokens?: number; duration_ms?: number; estimated_cost?: number };
  }
): void {
  if (!result.cost) return;
  if (result.cost.actual_cost != null) job.actual_cost = result.cost.actual_cost;
  if (result.cost.tokens != null) job.tokens = result.cost.tokens;
  if (result.cost.duration_ms != null) job.duration_ms = result.cost.duration_ms;
  if (result.cost.estimated_cost != null) job.estimated_cost = result.cost.estimated_cost;
}

/** Default: next job depends on the job that enqueued it. Explicit deps win. */
function resolveDeps(job: Job, req: EnqueueRequest): string[] {
  if (req.dependencies !== undefined) return req.dependencies;

  // Writing / Multi Review children are parallel after parent spawn — no dep on parent success gate
  if (
    req.agent_id === "draft" ||
    req.agent_id === "introduction" ||
    req.agent_id === "japanese-perspective" ||
    req.agent_id === "image-prompt" ||
    req.agent_id === "seo" ||
    req.agent_id === "internal-link" ||
    QUALITY_CHILDREN.includes(req.agent_id)
  ) {
    return [];
  }

  return [job.id];
}

function enqueueFromResult(job: Job, requests: EnqueueRequest[] | undefined): Job[] {
  if (!requests?.length) return [];
  const created: Job[] = [];

  for (const req of requests) {
    if (req.type === "review" || req.payload?.gate === "human_review") {
      const reviewJob = createJob({
        ...req,
        type: "review",
        agent_id: "publish",
        dependencies: [],
        payload: { ...req.payload, from_job_id: job.id },
      });
      reviewJob.status = "needs_human";
      reviewJob.quality_score = Number(req.payload?.quality_score ?? job.quality_score ?? 0);
      reviewJob.updated_at = isoNow();
      saveJob(reviewJob);
      created.push(reviewJob);
      continue;
    }

    created.push(
      createJob({
        ...req,
        dependencies: resolveDeps(job, req),
      })
    );
  }
  refreshDependencyGates();
  return created;
}

/** After writing children succeed, enqueue fact-check once. */
export function reconcileWritingChildren(slug: string): Job | null {
  const related = listJobs().filter((j) => j.payload?.slug === slug);
  const kids = WRITING_CHILDREN.map((id) =>
    related.find((j) => j.agent_id === id && j.status === "succeeded")
  );
  if (kids.some((k) => !k)) return null;

  const existing = related.find(
    (j) =>
      j.agent_id === "fact-check" &&
      ["pending", "ready", "running", "succeeded", "needs_human", "approved"].includes(j.status)
  );
  if (existing) return existing;

  const parent = related.find((j) => j.agent_id === "writing");
  const draft = kids[0]!;
  const factJob = createJob({
    type: "fact-check",
    agent_id: "fact-check",
    parent_id: parent?.id,
    payload: {
      slug,
      title: draft.payload.title,
      draft_path: draft.payload.draft_path,
      writing_parent_id: parent?.id,
    },
    dependencies: kids.map((k) => k!.id),
    idempotency_key: `factcheck:${slug}`,
    estimated_cost: 0.04,
  });
  refreshDependencyGates();
  return factJob;
}

/** After Multi Review skills succeed for a revision round, enqueue final-editorial-review once. */
export function reconcileQualityChildren(slug: string, revisionRound = 0): Job | null {
  const related = listJobs().filter(
    (j) =>
      j.payload?.slug === slug && Number(j.payload?.revision_round ?? 0) === revisionRound
  );
  const kids = QUALITY_CHILDREN.map((id) =>
    related.find((j) => j.agent_id === id && j.status === "succeeded")
  );
  if (kids.some((k) => !k)) return null;

  const existing = related.find(
    (j) =>
      j.agent_id === "final-editorial-review" &&
      ["pending", "ready", "running", "succeeded", "needs_human", "approved"].includes(j.status)
  );
  if (existing) return existing;

  const parent = listJobs().find(
    (j) => j.payload?.slug === slug && j.agent_id === "editorial-quality"
  );
  const sample = kids[0]!;
  const qualityParentId =
    parent?.id ??
    (sample.payload.quality_parent_id ? String(sample.payload.quality_parent_id) : undefined);
  const finalJob = createJob({
    type: "quality",
    agent_id: "final-editorial-review",
    parent_id: qualityParentId,
    payload: {
      slug,
      title: sample.payload.title,
      draft_path: sample.payload.draft_path,
      fact_check_path: sample.payload.fact_check_path,
      writing_parent_id: sample.payload.writing_parent_id,
      quality_parent_id: qualityParentId,
      revision_round: revisionRound,
    },
    dependencies: kids.map((k) => k!.id),
    idempotency_key: `final-editorial:${slug}:r${revisionRound}`,
    estimated_cost: 0.012,
    priority: 86,
  });
  refreshDependencyGates();
  return finalJob;
}

export async function processJob(job: Job): Promise<void> {
  const agent = await loadAgent(job.agent_id);
  const started = Date.now();
  try {
    const result = await agent.run(
      { job, workspaceRoot: workspaceRoot(), now: new Date() },
      { ...job.payload }
    );

    job.duration_ms = Date.now() - started;
    applyCost(job, result);
    if (result.prompt_versions) {
      job.prompt_versions = { ...job.prompt_versions, ...result.prompt_versions };
    }
    if (result.quality_score != null) job.quality_score = result.quality_score;

    if (!result.ok) {
      job.retry_count += 1;
      job.error = {
        code: result.error?.code ?? "AGENT_ERROR",
        message: result.error?.message ?? "Agent failed",
        at: isoNow(),
        retryable: result.error?.retryable ?? false,
      };
      job.locked_by = undefined;
      job.locked_at = undefined;
      if (job.retry_count > job.max_retries || !result.error?.retryable) {
        moveToFailed(job);
      } else {
        job.status = "pending";
        job.updated_at = isoNow();
        saveJob(job);
      }
      return;
    }

    job.result = result.output;
    job.status = "succeeded";
    job.locked_by = undefined;
    job.locked_at = undefined;
    job.updated_at = isoNow();
    job.error = undefined;
    saveJob(job);

    enqueueFromResult(job, result.enqueue);

    const slug = job.payload?.slug ? String(job.payload.slug) : null;
    if (slug && WRITING_CHILDREN.includes(job.agent_id)) {
      reconcileWritingChildren(slug);
    }
    if (slug && QUALITY_CHILDREN.includes(job.agent_id)) {
      reconcileQualityChildren(slug, Number(job.payload?.revision_round ?? 0));
    }
  } catch (err) {
    job.retry_count += 1;
    job.error = {
      code: "EXCEPTION",
      message: err instanceof Error ? err.message : String(err),
      at: isoNow(),
      retryable: true,
    };
    job.locked_by = undefined;
    job.locked_at = undefined;
    if (job.retry_count > job.max_retries) {
      moveToFailed(job);
    } else {
      job.status = "pending";
      job.updated_at = isoNow();
      saveJob(job);
    }
  }
}

function claimNextReadyExcludingReview(workerId: string): Job | null {
  refreshDependencyGates();
  const candidates = listJobs({ status: "ready" }).filter((j) => j.type !== "review");
  for (const job of candidates) {
    if (job.locked_by) continue;
    job.status = "running";
    job.locked_by = workerId;
    job.locked_at = isoNow();
    job.updated_at = isoNow();
    saveJob(job);
    return job;
  }
  return null;
}

export async function runWorkerLoop(opts: {
  queue?: QueueName | "any";
  maxJobs?: number;
  workerId?: string;
}): Promise<number> {
  const maxJobs = opts.maxJobs ?? 50;
  const workerId = opts.workerId ?? `worker_${process.pid}`;
  let processed = 0;

  while (processed < maxJobs) {
    const job = claimNextReadyExcludingReview(workerId);
    if (!job) break;
    await processJob(job);
    processed += 1;
  }

  recomputeMetrics();
  return processed;
}

export function reviewAction(
  jobId: string,
  action: "approve" | "reject" | "needs_rewrite",
  note?: string
): Job {
  const job = getJobById(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  if (job.type !== "review") throw new Error(`Not a review job: ${jobId}`);

  job.updated_at = isoNow();
  job.result = { ...(job.result ?? {}), review_note: note ?? null, reviewed_at: isoNow() };

  if (action === "approve") {
    job.status = "approved";
    saveJob(job);
    createJob({
      type: "publish",
      agent_id: "publish",
      payload: {
        ...job.payload,
        quality_score: job.quality_score ?? job.payload.quality_score,
      },
      dependencies: [job.id],
      idempotency_key: `publish:${String(job.payload.slug)}`,
      estimated_cost: 0.002,
      priority: 100,
    });
  } else if (action === "reject") {
    job.status = "rejected";
    saveJob(job);
  } else {
    job.status = "needs_rewrite";
    saveJob(job);
    createJob({
      type: "writing",
      agent_id: "draft",
      payload: {
        ...job.payload,
        rewrite: true,
        review_note: note,
        writing_parent_id: job.payload.writing_parent_id,
      },
      idempotency_key: `draft-rewrite:${String(job.payload.slug)}:${Date.now()}`,
      estimated_cost: 0.15,
      priority: 95,
    });
  }

  refreshDependencyGates();
  recomputeMetrics();
  return job;
}
