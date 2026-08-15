import Link from "next/link";
import type { ArticleReviewDecision, EditorialScore, Job } from "../../../os/types";

function overallFromJob(job: Job): string | number {
  const article = job.payload.article_review as ArticleReviewDecision | undefined;
  if (article && typeof article.overall_score === "number") return article.overall_score;
  const score = job.payload.editorial_score as EditorialScore | undefined;
  if (score && typeof score.overall === "number") return score.overall;
  return job.quality_score ?? "—";
}

function statusFromJob(job: Job): string {
  const article = job.payload.article_review as ArticleReviewDecision | undefined;
  if (article?.status) return article.status;
  const flag = job.payload.article_review_status;
  if (typeof flag === "string") return flag;
  return job.status;
}

export function ReviewList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-[var(--muted)]">
        No articles waiting for review. Run{" "}
        <code className="text-xs">npm run editorial:review -- &lt;slug&gt;</code>.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-300/80 bg-white/70">
      {jobs.map((job) => (
        <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium text-[var(--ink)]">
              {String(job.payload.title ?? job.payload.slug ?? job.id)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Article Review · Score {overallFromJob(job)} · {statusFromJob(job)}
            </p>
          </div>
          <Link
            href={`/os/review/${job.id}`}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
          >
            Review
          </Link>
        </li>
      ))}
    </ul>
  );
}
