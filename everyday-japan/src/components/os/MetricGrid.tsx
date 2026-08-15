import type { FactoryMetrics } from "../../../os/types";

const CARDS: { key: keyof FactoryMetrics; label: string }[] = [
  { key: "topics_candidates", label: "Topics" },
  { key: "research", label: "Research" },
  { key: "writing", label: "Writing" },
  { key: "review_waiting", label: "Review待ち" },
  { key: "published", label: "Published" },
  { key: "errors", label: "Error" },
];

export function MetricGrid({ metrics }: { metrics: FactoryMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map((c) => (
        <div
          key={c.key}
          className="rounded-lg border border-slate-300/80 bg-white/70 px-4 py-5 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{c.label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--ink)]">
            {Number(metrics[c.key] ?? 0)}
          </p>
        </div>
      ))}
    </div>
  );
}
