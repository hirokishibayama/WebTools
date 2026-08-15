import fs from "node:fs";
import path from "node:path";
import type { Job, JobStatus, QueueName, EnqueueRequest, AgentId } from "../types";
import {
  ensureDir,
  isoNow,
  jobFilePath,
  jobPartitionDir,
  newId,
  readJson,
  resolvePath,
  writeJson,
} from "./fs";

const INDEX_PATH = () => resolvePath("data/index/jobs-index.json");

interface JobIndexEntry {
  id: string;
  type: QueueName;
  status: JobStatus;
  path: string;
  updated_at: string;
  parent_id?: string;
  idempotency_key?: string;
  quality_score?: number;
}

interface JobIndex {
  updated_at: string;
  entries: Record<string, JobIndexEntry>;
}

function loadIndex(): JobIndex {
  return readJson<JobIndex>(INDEX_PATH(), { updated_at: isoNow(), entries: {} });
}

function saveIndex(index: JobIndex): void {
  index.updated_at = isoNow();
  writeJson(INDEX_PATH(), index);
}

function upsertIndex(job: Job, filePath: string): void {
  const index = loadIndex();
  index.entries[job.id] = {
    id: job.id,
    type: job.type,
    status: job.status,
    path: path.relative(resolvePath(), filePath),
    updated_at: job.updated_at,
    parent_id: job.parent_id,
    idempotency_key: job.idempotency_key,
    quality_score: job.quality_score,
  };
  saveIndex(index);
}

export function findByIdempotencyKey(key: string): Job | null {
  const index = loadIndex();
  for (const entry of Object.values(index.entries)) {
    if (entry.idempotency_key === key) {
      const job = getJobById(entry.id);
      if (job && (job.status === "running" || job.status === "succeeded" || job.status === "ready" || job.status === "needs_human" || job.status === "approved")) {
        return job;
      }
    }
  }
  return null;
}

export function createJob(req: EnqueueRequest & { agent_id: AgentId }): Job {
  if (req.idempotency_key) {
    const existing = findByIdempotencyKey(req.idempotency_key);
    if (existing) return existing;
  }

  const now = isoNow();
  const deps = req.dependencies ?? [];
  let status: Job["status"] = deps.length === 0 ? "ready" : "pending";
  if (deps.length > 0) {
    const allDone = deps.every((depId) => {
      const dep = getJobById(depId);
      if (!dep) return false;
      return dep.status === "succeeded" || dep.status === "approved";
    });
    if (allDone) status = "ready";
  }

  const job: Job = {
    id: newId(req.type),
    type: req.type,
    agent_id: req.agent_id,
    status,
    created_at: now,
    updated_at: now,
    retry_count: 0,
    max_retries: 3,
    dependencies: deps,
    parent_id: req.parent_id,
    payload: req.payload,
    priority: req.priority ?? 50,
    idempotency_key: req.idempotency_key,
    estimated_cost: req.estimated_cost ?? 0,
    actual_cost: 0,
    tokens: 0,
    duration_ms: 0,
  };

  const file = jobFilePath(job.type, job.id);
  writeJson(file, job);
  upsertIndex(job, file);

  if (req.parent_id) {
    const parent = getJobById(req.parent_id);
    if (parent) {
      parent.children = [...(parent.children ?? []), job.id];
      parent.updated_at = isoNow();
      saveJob(parent);
    }
  }

  return job;
}

export function saveJob(job: Job): void {
  const index = loadIndex();
  const entry = index.entries[job.id];
  const file = entry
    ? resolvePath(entry.path)
    : jobFilePath(job.type, job.id, new Date(job.created_at));
  ensureDir(path.dirname(file));
  writeJson(file, job);
  upsertIndex(job, file);
}

export function getJobById(id: string): Job | null {
  const index = loadIndex();
  const entry = index.entries[id];
  if (!entry) return null;
  const full = resolvePath(entry.path);
  if (!fs.existsSync(full)) return null;
  return readJson<Job>(full, null as unknown as Job);
}

export function listJobs(filter?: {
  type?: QueueName;
  status?: JobStatus | JobStatus[];
}): Job[] {
  const index = loadIndex();
  const statuses = filter?.status
    ? Array.isArray(filter.status)
      ? filter.status
      : [filter.status]
    : null;

  const jobs: Job[] = [];
  for (const entry of Object.values(index.entries)) {
    if (filter?.type && entry.type !== filter.type) continue;
    if (statuses && !statuses.includes(entry.status)) continue;
    const job = getJobById(entry.id);
    if (job) jobs.push(job);
  }
  return jobs.sort((a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at));
}

export function claimNextReady(
  queue: QueueName | "any",
  workerId: string
): Job | null {
  refreshDependencyGates();
  const candidates = listJobs({
    status: "ready",
    ...(queue === "any" ? {} : { type: queue }),
  });

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

/** pending → ready when all dependencies succeeded (or approved for review deps) */
export function refreshDependencyGates(): void {
  const pending = listJobs({ status: "pending" });
  for (const job of pending) {
    if (job.dependencies.length === 0) {
      job.status = "ready";
      job.updated_at = isoNow();
      saveJob(job);
      continue;
    }
    const ok = job.dependencies.every((depId) => {
      const dep = getJobById(depId);
      if (!dep) return false;
      return dep.status === "succeeded" || dep.status === "approved";
    });
    if (ok) {
      job.status = "ready";
      job.updated_at = isoNow();
      saveJob(job);
    }
  }
}

export function moveToFailed(job: Job): void {
  job.status = "dead";
  job.updated_at = isoNow();
  const dest = path.join(
    jobPartitionDir("_failed", new Date(job.created_at)),
    `${job.id}.json`
  );
  writeJson(dest, job);

  const index = loadIndex();
  const prev = index.entries[job.id];
  if (prev) {
    const oldPath = resolvePath(prev.path);
    if (fs.existsSync(oldPath) && oldPath !== dest) fs.unlinkSync(oldPath);
  }
  upsertIndex(job, dest);
}

export function countByStatus(): Record<string, number> {
  const index = loadIndex();
  const counts: Record<string, number> = {};
  for (const e of Object.values(index.entries)) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
  }
  return counts;
}

export function countByQueueStatus(): Record<string, Record<string, number>> {
  const index = loadIndex();
  const out: Record<string, Record<string, number>> = {};
  for (const e of Object.values(index.entries)) {
    out[e.type] ??= {};
    out[e.type][e.status] = (out[e.type][e.status] ?? 0) + 1;
  }
  return out;
}
