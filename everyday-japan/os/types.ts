/**
 * Everyday Japan — AI Editorial OS core types
 * Designed for ~100k articles: Job-centric, queue-routed, agent-swappable.
 */

export type QueueName =
  | "trend"
  | "topic"
  | "research"
  | "outline"
  | "writing"
  | "media"
  | "seo"
  | "fact-check"
  | "quality"
  | "review"
  | "publish"
  | "analytics"
  | "_failed";

export type AgentId =
  | "trend-discovery"
  | "topic-scoring"
  | "duplicate-checker"
  | "research"
  | "outline"
  | "writing" // parent orchestrator
  | "draft"
  | "introduction"
  | "japanese-perspective"
  | "image-prompt"
  | "seo"
  | "internal-link"
  | "fact-check"
  | "editorial-quality" // parent: multi-review orchestrator
  | "article-review" // Article Review Flow — orchestrates 7 skills + revision loop
  | "review-reader-experience"
  | "review-japanese-perspective"
  | "review-cultural-accuracy"
  | "review-fact-source"
  | "review-seo-intent"
  | "review-english-naturalness"
  | "review-editorial-originality"
  | "final-editorial-review"
  | "revision"
  | "publish"
  | "analytics";

export type ReviewSeverity = "critical" | "major" | "minor";
export type ReviewStatus = "pass" | "revise" | "fail";

/** Final gate after Article Review Flow */
export type ArticleReviewDecisionStatus = "PASS" | "HUMAN_REVIEW" | "REVISE" | "FAIL";

export interface ReviewIssue {
  severity: ReviewSeverity;
  location: string;
  problem: string;
  suggestion: string;
}

/** Aggregated issue across multiple skills (deduped). */
export interface AggregatedIssue {
  severity: ReviewSeverity;
  location: string;
  problem: string;
  suggestion: string;
  sources: string[];
}

export interface ArticleReviewSkillScores {
  reader: number;
  japanese_perspective: number;
  cultural_accuracy: number;
  fact_source: number;
  seo: number;
  english: number;
  originality: number;
}

export interface ArticleReviewDecision {
  status: ArticleReviewDecisionStatus;
  overall_score: number;
  critical_issues: AggregatedIssue[];
  major_issues: AggregatedIssue[];
  minor_issues: AggregatedIssue[];
  revision_rounds: number;
  skill_scores: ArticleReviewSkillScores;
  final_summary: string;
}

/** One specialized Multi Review skill result. */
export interface SkillReviewResult {
  reviewer: string;
  score: number;
  status: ReviewStatus;
  strengths: string[];
  issues: ReviewIssue[];
  /** Fact & Source extras */
  verified?: string[];
  questionable?: string[];
  unsupported?: string[];
  needs_source?: string[];
  /** Optional free-form revision notes */
  specific_revisions?: string[];
  duration_ms?: number;
  prompt_version?: string;
  scored_at?: string;
}

export interface FinalEditorialReview {
  overall_score: number;
  status: ReviewStatus;
  priority_revisions: string[];
  publish_recommendation: string;
  scored_at: string;
  revision_round?: number;
  prompt_version?: string;
}

/** Human-editor quality gate scores (0–100). Multi Review nests under this. */
export interface EditorialScore {
  cultural_accuracy: number;
  japanese_perspective: number;
  reader_engagement: number;
  seo_quality: number;
  /** Extended dimensions from Multi Review */
  fact_source?: number;
  english_naturalness?: number;
  editorial_originality?: number;
  overall: number;
  notes?: {
    cultural_accuracy?: string[];
    japanese_perspective?: string[];
    reader_engagement?: string[];
    seo_quality?: string[];
    fact_source?: string[];
    english_naturalness?: string[];
    editorial_originality?: string[];
  };
  verdict: ReviewStatus;
  scored_at: string;
  prompt_version?: string;
  /** Nested Multi Review skill results */
  multi_reviews?: SkillReviewResult[];
  final_review?: FinalEditorialReview;
  revision_round?: number;
  /** Article Review Flow final decision */
  article_review?: ArticleReviewDecision;
}

export type JobStatus =
  | "pending"
  | "ready"
  | "running"
  | "succeeded"
  | "failed"
  | "dead"
  | "cancelled"
  | "needs_human"
  | "approved"
  | "rejected"
  | "needs_rewrite";

export interface JobCost {
  estimated_cost: number;
  actual_cost: number;
  tokens: number;
  duration_ms: number;
}

export interface JobError {
  code: string;
  message: string;
  at: string;
  retryable: boolean;
}

export interface Job {
  id: string;
  type: QueueName;
  agent_id: AgentId;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  retry_count: number;
  max_retries: number;
  dependencies: string[];
  parent_id?: string;
  children?: string[];
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: JobError;
  priority: number;
  locked_by?: string;
  locked_at?: string;
  idempotency_key?: string;
  /** 0–100; updated by scoring / fact-check / review */
  quality_score?: number;
  /** Prompt versions used for this job */
  prompt_versions?: Record<string, string>;
  /** Cost tracking (mock values OK for now) */
  estimated_cost: number;
  actual_cost: number;
  tokens: number;
  duration_ms: number;
}

export interface ArtifactRef {
  kind: string;
  path: string;
}

export interface EnqueueRequest {
  type: QueueName;
  agent_id: AgentId;
  payload: Record<string, unknown>;
  dependencies?: string[];
  parent_id?: string;
  priority?: number;
  idempotency_key?: string;
  estimated_cost?: number;
}

export interface AgentResult {
  ok: boolean;
  output?: Record<string, unknown>;
  artifacts?: ArtifactRef[];
  enqueue?: EnqueueRequest[];
  metrics?: Record<string, number>;
  quality_score?: number;
  prompt_versions?: Record<string, string>;
  cost?: Partial<JobCost>;
  error?: { code: string; message: string; retryable: boolean };
}

export interface AgentManifest {
  id: AgentId;
  version: string;
  queue: QueueName;
  module: string;
  prompt?: string;
  description: string;
  dependencies: AgentId[];
  retry: { max: number; retryableErrors: string[] };
  timeoutMs: number;
  mock: boolean;
  /** Parent writing orchestrator spawns these child agents */
  childAgents?: AgentId[];
}

export interface AgentContext {
  job: Job;
  workspaceRoot: string;
  now: Date;
}

export interface Agent {
  manifest: AgentManifest;
  run(ctx: AgentContext, input: Record<string, unknown>): Promise<AgentResult>;
}

export interface CandidateTopic {
  id: string;
  title: string;
  seed_source: string;
  raw_score_hint?: number;
}

export interface ScoredTopic extends CandidateTopic {
  scores: {
    foreign_interest: number;
    seo: number;
    originality: number;
    evergreen: number;
    japaneseness: number;
  };
  total: number;
}

export interface DuplicateReport {
  similar: { slug: string; title: string; similarity: number }[];
  max_similarity: number;
  recommendation: "publish" | "merge" | "kill";
}

export interface FactoryMetrics {
  updated_at: string;
  topics_candidates: number;
  topic_queued: number;
  research: number;
  outline: number;
  writing: number;
  review_waiting: number;
  published: number;
  errors: number;
  by_queue: Record<string, Record<string, number>>;
}

export interface ScoringWeights {
  foreign_interest: number;
  seo: number;
  originality: number;
  evergreen: number;
  japaneseness: number;
}

export interface AnalyticsFeedback {
  updated_at: string;
  weights: ScoringWeights;
  signals: {
    high_performing_keywords: string[];
    low_performing_patterns: string[];
    notes: string;
  };
}
