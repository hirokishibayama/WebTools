import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob, readDraftPreview, readEditorialScore } from "@/lib/os/dashboard";
import { ReviewActions } from "@/components/os/ReviewActions";
import { EditorialScoreCard } from "@/components/os/EditorialScoreCard";

export const dynamic = "force-dynamic";

export default async function OsReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job || job.type !== "review") notFound();

  const preview = readDraftPreview(job);
  const score = readEditorialScore(job);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/os" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
        ← Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-semibold text-[var(--accent)]">
        {String(job.payload.title ?? "Review")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Target: ≤10 minutes · Article Review{" "}
        {score?.article_review?.overall_score ?? score?.overall ?? job.quality_score ?? "—"} ·{" "}
        {String(
          score?.article_review?.status ??
            job.payload.article_review_status ??
            job.status
        )}
      </p>

      <div className="mt-8">
        <EditorialScoreCard score={score} />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          Preview
        </h2>
        <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-300/80 bg-white/80 p-4 text-sm leading-relaxed text-[var(--ink)]">
          {preview}
        </pre>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          Decision
        </h2>
        <ReviewActions jobId={job.id} />
      </div>
    </main>
  );
}
