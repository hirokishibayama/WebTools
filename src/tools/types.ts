import type { ComponentType } from "react";

export type ToolCategory =
  | "text"
  | "convert"
  | "file"
  | "image"
  | "ai";

export type ToolStatus = "published" | "draft";

export type ToolTier = "free" | "pro";

export type FaqItem = {
  question: string;
  answer: string;
};

export type HowToStep = {
  title: string;
  description: string;
};

export type ToolSeo = {
  title: string;
  description: string;
  h1: string;
};

/** Future monetization hooks — unused in MVP UI but reserved for scale. */
export type ToolLimits = {
  maxInputChars?: number;
  maxFileBytes?: number;
  dailyAiCalls?: number;
  adsEnabled?: boolean;
};

export type ToolFeatures = {
  batchProcessing?: boolean;
  exportFormats?: string[];
  aiModes?: string[];
};

export type ToolDefinition = {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  keywords: string[];
  seo: ToolSeo;
  howTo: HowToStep[];
  faqs: FaqItem[];
  relatedSlugs: string[];
  status: ToolStatus;
  isNew?: boolean;
  isPopular?: boolean;
  publishedAt: string;
  tier?: ToolTier;
  features?: ToolFeatures;
  limits?: ToolLimits;
  /** Dynamic import of the interactive tool UI */
  loadComponent: () => Promise<{ default: ComponentType }>;
};

export type ToolSlug = string;

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  text: "テキスト",
  convert: "変換",
  file: "ファイル",
  image: "画像",
  ai: "AI",
};
