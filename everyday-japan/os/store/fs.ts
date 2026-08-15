import fs from "node:fs";
import path from "node:path";
import type { QueueName } from "../types";

/** Scripts and workers must run with cwd = everyday-japan package root. */
export function workspaceRoot(): string {
  return process.cwd();
}

export function resolvePath(...parts: string[]): string {
  return path.join(workspaceRoot(), ...parts);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

/** Partition path for 100k-scale: jobs/{queue}/{yyyy}/{mm}/{dd}/{id}.json */
export function jobPartitionDir(queue: QueueName, date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return resolvePath("jobs", queue, String(y), m, d);
}

export function jobFilePath(queue: QueueName, id: string, date = new Date()): string {
  return path.join(jobPartitionDir(queue, date), `${id}.json`);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function newId(prefix = "job"): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}
