import type { Metadata } from "next";
import Link from "next/link";
import { getMetrics, getReviewQueue } from "@/lib/os/dashboard";
import { MetricGrid } from "@/components/os/MetricGrid";
import { ReviewList } from "@/components/os/ReviewList";

export const metadata: Metadata = {
  title: "Editorial OS Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function OsDashboardPage() {
  // Vercel ではファイルパス解決や JSON パースの失敗で 500 になることがあるため、
  // 例外は握りつぶさず画面に表示して原因を追跡できるようにする。
  let metrics = {} as ReturnType<typeof getMetrics>;
  let reviews: ReturnType<typeof getReviewQueue> = [];
  let error: string | null = null;
  try {
    metrics = getMetrics();
    reviews = getReviewQueue();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    // ここで再度 getMetrics() を呼ばない。二度目も落ちる可能性があるため。
    // MetricGrid 側は Number(metrics[key] ?? 0) なので空でも描画可能。
    metrics = {} as ReturnType<typeof getMetrics>;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm tracking-wide text-[var(--muted)]">AI Editorial OS</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-[var(--accent)]">
            Factory Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-[var(--muted)]">
            Review queue with Editorial Scores. Public site stays at{" "}
            <Link className="underline" href="/">
              /
            </Link>
            .
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
        metrics @ {metrics?.updated_at ? new Date(metrics.updated_at).toLocaleString() : "—"}
        </p>
      </header>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          /os dashboard error: {error}
        </div>
      ) : null}

      <MetricGrid metrics={metrics ?? ({} as any)} />

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Review queue</h2>
          <span className="text-sm text-[var(--muted)]">{reviews.length} waiting</span>
        </div>
        <ReviewList jobs={reviews} />
      </section>
    </main>
  );
}
