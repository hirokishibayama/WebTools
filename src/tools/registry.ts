import type { ToolCategory, ToolDefinition } from "@/tools/types";
import { textCounterConfig } from "@/tools/text-counter/config";
import { zenkakuHankakuConfig } from "@/tools/zenkaku-hankaku/config";
import { pdfCompressConfig } from "@/tools/pdf-compress/config";
import { imageCompressConfig } from "@/tools/image-compress/config";
import { aiProofreadConfig } from "@/tools/ai-proofread/config";

/**
 * Central tool registry.
 * To add a tool: create src/tools/<slug>/{config,component}.ts(x) and append one entry here.
 * No new App Router pages are required.
 */
export const tools: ToolDefinition[] = [
  {
    ...textCounterConfig,
    loadComponent: () => import("@/tools/text-counter/component"),
  },
  {
    ...zenkakuHankakuConfig,
    loadComponent: () => import("@/tools/zenkaku-hankaku/component"),
  },
  {
    ...pdfCompressConfig,
    loadComponent: () => import("@/tools/pdf-compress/component"),
  },
  {
    ...imageCompressConfig,
    loadComponent: () => import("@/tools/image-compress/component"),
  },
  {
    ...aiProofreadConfig,
    loadComponent: () => import("@/tools/ai-proofread/component"),
  },
];

const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));

export function getAllTools(includeDraft = false): ToolDefinition[] {
  return tools.filter((t) => includeDraft || t.status === "published");
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  const tool = bySlug.get(slug);
  if (!tool || tool.status !== "published") return undefined;
  return tool;
}

export function getPopularTools(limit = 6): ToolDefinition[] {
  return getAllTools()
    .filter((t) => t.isPopular)
    .slice(0, limit);
}

export function getNewTools(limit = 6): ToolDefinition[] {
  return getAllTools()
    .filter((t) => t.isNew)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return getAllTools().filter((t) => t.category === category);
}

export function getCategories(): ToolCategory[] {
  return [...new Set(getAllTools().map((t) => t.category))];
}

export function getRelatedTools(slug: string, limit = 3): ToolDefinition[] {
  const tool = bySlug.get(slug);
  if (!tool) return [];
  return tool.relatedSlugs
    .map((s) => getToolBySlug(s))
    .filter((t): t is ToolDefinition => Boolean(t))
    .slice(0, limit);
}

export function getAllSlugs(): string[] {
  return getAllTools().map((t) => t.slug);
}
