/** Pipeline stage identifiers — keep in sync with agent configs. */
export type PipelineStage =
  | "topic"
  | "research"
  | "outline"
  | "draft"
  | "seo"
  | "fact-check"
  | "review"
  | "publish";

export type TopicStatus = "proposed" | "approved" | "rejected" | "deferred";

export type FactCheckVerdict = "pass" | "pass-with-revisions" | "fail";

export type Priority = "high" | "medium" | "low";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface AgentConfig {
  id: string;
  name: string;
  stage: number;
  purpose: string;
  prompt: string;
  systemPrompt: string;
  inputs: string[];
  dependsOn?: string[];
  output: {
    file: string;
    template: string;
    checklist?: string;
  };
  humanRequired?: boolean;
  automation: {
    webSearch: boolean;
    replaceable: boolean;
    planned?: string;
    note?: string;
  };
  constraints?: {
    minWords?: number;
    maxWords?: number;
    forbiddenPhrases?: string[];
  };
  optionalFutureInputs?: string[];
}

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  category: string;
  keywords: string[];
  status: "draft" | "review" | "published";
  word_count?: number;
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
  related?: string[];
  updated?: string;
}

/** Expected artifact filenames inside content/drafts/<slug>/ */
export const STAGE_FILES: Record<Exclude<PipelineStage, "publish">, string> = {
  topic: "topic.md",
  research: "research.md",
  outline: "outline.md",
  draft: "draft.md",
  seo: "seo.md",
  "fact-check": "fact-check.md",
  review: "review.md",
};

export const PIPELINE_ORDER: Exclude<PipelineStage, "publish">[] = [
  "topic",
  "research",
  "outline",
  "draft",
  "seo",
  "fact-check",
  "review",
];
