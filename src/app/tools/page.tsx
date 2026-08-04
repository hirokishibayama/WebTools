import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { CategorySection } from "@/components/tools/CategorySection";
import { getAllTools, getCategories, getToolsByCategory } from "@/tools/registry";

export const metadata: Metadata = {
  title: "ツール一覧",
  description: "無料で使える便利ツールの一覧。テキスト、変換、ファイル、画像、AI対応。",
};

export default function ToolsPage() {
  const tools = getAllTools();
  const categories = getCategories();

  return (
    <Container className="space-y-10 py-8 sm:py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">ツール一覧</h1>
        <p className="text-[var(--color-muted)]">
          現在 {tools.length} 個のツールを公開中。すべて無料で利用できます。
        </p>
      </div>

      <div className="space-y-10">
        {categories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            tools={getToolsByCategory(category)}
          />
        ))}
      </div>
    </Container>
  );
}
