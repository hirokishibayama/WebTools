import Link from "next/link";
import type { ToolDefinition } from "@/tools/types";
import { CATEGORY_LABELS } from "@/tools/types";

type ToolCardProps = {
  tool: ToolDefinition;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group block rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-accent)] hover:shadow-md"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
          {CATEGORY_LABELS[tool.category]}
        </span>
        {tool.isNew && (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
            NEW
          </span>
        )}
        {tool.isPopular && (
          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">
            人気
          </span>
        )}
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
        {tool.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{tool.description}</p>
    </Link>
  );
}
