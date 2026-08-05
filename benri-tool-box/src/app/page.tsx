import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { CategorySection } from "@/components/tools/CategorySection";
import { ToolCard } from "@/components/tools/ToolCard";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import {
  getCategories,
  getNewTools,
  getPopularTools,
  getToolsByCategory,
} from "@/tools/registry";
import { CATEGORY_LABELS } from "@/tools/types";

export default function HomePage() {
  const popular = getPopularTools();
  const newest = getNewTools();
  const categories = getCategories();

  return (
    <Container className="space-y-14 py-10 sm:py-14">
      <section className="space-y-5">
        <p className="text-sm font-medium tracking-wide text-[var(--color-accent)]">
          日本向けオンライン便利ツール
        </p>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          {SITE_NAME}
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
          {SITE_DESCRIPTION}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tools"
            className="rounded-[var(--radius)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            ツール一覧を見る
          </Link>
          <Link
            href="/tools/text-counter"
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--color-bg)]"
          >
            文字数カウンターを使う
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">人気ツール</h2>
          <Link href="/tools" className="text-sm text-[var(--color-accent)] hover:underline">
            すべて見る
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">新着ツール</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newest.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">カテゴリ一覧</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <a
              key={category}
              href={`#category-${category}`}
              className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {CATEGORY_LABELS[category]}
            </a>
          ))}
        </div>
        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category} id={`category-${category}`}>
              <CategorySection category={category} tools={getToolsByCategory(category)} />
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
