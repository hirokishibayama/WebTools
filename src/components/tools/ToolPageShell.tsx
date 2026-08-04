import Link from "next/link";
import type { ReactNode } from "react";
import type { ToolDefinition } from "@/tools/types";
import { getRelatedTools } from "@/tools/registry";
import { AdSlot } from "@/components/ads/AdSlot";
import { ToolCard } from "@/components/tools/ToolCard";

type ToolPageShellProps = {
  tool: ToolDefinition;
  children: ReactNode;
};

export function ToolPageShell({ tool, children }: ToolPageShellProps) {
  const related = getRelatedTools(tool.slug);

  return (
    <div className="space-y-10 py-8 sm:py-10">
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-text)]">
            ホーム
          </Link>
          <span className="mx-2">/</span>
          <Link href="/tools" className="hover:text-[var(--color-text)]">
            ツール一覧
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-text)]">{tool.name}</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tool.seo.h1}</h1>
        <p className="max-w-2xl text-[var(--color-muted)]">{tool.description}</p>
      </div>

      <AdSlot slot="top" />

      <section
        aria-label={`${tool.name}の操作エリア`}
        className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6"
      >
        {children}
      </section>

      <AdSlot slot="in-content" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">使い方</h2>
        <ol className="space-y-3">
          {tool.howTo.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-accent)]">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-[var(--color-muted)]">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">よくある質問</h2>
        <div className="space-y-3">
          {tool.faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <summary className="cursor-pointer list-none font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-[var(--color-muted)] transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">関連ツール</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ToolCard key={item.slug} tool={item} />
            ))}
          </div>
        </section>
      )}

      <AdSlot slot="bottom" />
    </div>
  );
}
