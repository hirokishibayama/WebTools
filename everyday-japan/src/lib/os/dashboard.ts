import type { FactoryMetrics, Job, EditorialScore } from "../../../os/types";
import { readJson, resolvePath } from "../../../os/store/fs";
import { getJobById, listJobs } from "../../../os/store/jobs";
import { recomputeMetrics } from "../../../os/metrics/recompute";
import fs from "node:fs";

export function getMetrics(): FactoryMetrics {
  const cached = readJson<FactoryMetrics | null>(resolvePath("data/metrics/latest.json"), null);
  if (cached) return cached;

  // Vercel の実行環境では、ファイルシステムへの書き込みが制限される場合がある。
  // /os 表示のためにキャッシュが無い場合でも recomputeMetrics()（writeJson を含む）
  // を強制せず、落ちずにフォールバックを返す。
  try {
    return recomputeMetrics();
  } catch {
    return {
      updated_at: new Date().toISOString(),
      topics_candidates: 0,
      topic_queued: 0,
      research: 0,
      outline: 0,
      writing: 0,
      review_waiting: 0,
      published: 0,
      errors: 0,
      by_queue: {},
    };
  }
}

export function getReviewQueue(): Job[] {
  return listJobs({ type: "review", status: "needs_human" });
}

export function getJob(id: string): Job | null {
  return getJobById(id);
}

export function readDraftPreview(job: Job): string {
  const draftRel = job.payload?.draft_path;
  if (typeof draftRel === "string") {
    const full = resolvePath(draftRel);
    if (fs.existsSync(full)) return fs.readFileSync(full, "utf8");
  }
  const slug = job.payload?.slug;
  if (typeof slug === "string") {
    const assetDraft = resolvePath("assets", slug, "draft.md");
    if (fs.existsSync(assetDraft)) return fs.readFileSync(assetDraft, "utf8");
    const published = resolvePath("articles", `${slug}.md`);
    if (fs.existsSync(published)) return fs.readFileSync(published, "utf8");
  }
  return "_No draft preview available._";
}

export function readEditorialScore(job: Job): EditorialScore | null {
  const fromPayload = job.payload?.editorial_score;
  if (fromPayload && typeof fromPayload === "object") {
    return fromPayload as EditorialScore;
  }
  const scorePath = job.payload?.editorial_score_path;
  if (typeof scorePath === "string") {
    return readJson<EditorialScore | null>(resolvePath(scorePath), null);
  }
  const slug = job.payload?.slug;
  if (typeof slug === "string") {
    const fromAssets = readJson<EditorialScore | null>(
      resolvePath("assets", slug, "editorial-score.json"),
      null
    );
    if (fromAssets) return fromAssets;
  }
  return null;
}

export function readArticleReview(
  job: Job
): import("../../../os/types").ArticleReviewDecision | null {
  const fromPayload = job.payload?.article_review;
  if (fromPayload && typeof fromPayload === "object") {
    return fromPayload as import("../../../os/types").ArticleReviewDecision;
  }
  const score = readEditorialScore(job);
  if (score?.article_review) return score.article_review;
  const slug = job.payload?.slug;
  if (typeof slug === "string") {
    return readJson(resolvePath("content", "reviews", String(slug), "final-review.json"), null);
  }
  return null;
}
