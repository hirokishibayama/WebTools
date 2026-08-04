import type { ToolCategory, ToolDefinition } from "@/tools/types";
import { CATEGORY_LABELS } from "@/tools/types";
import { ToolCard } from "./ToolCard";

type CategorySectionProps = {
  category: ToolCategory;
  tools: ToolDefinition[];
};

export function CategorySection({ category, tools }: CategorySectionProps) {
  if (tools.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{CATEGORY_LABELS[category]}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  );
}
