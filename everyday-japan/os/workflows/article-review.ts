/**
 * Article Review Flow — Layer 3 workflow.
 * Runs 7 Review Skills → Synthesis → Revision loop → Final Decision in one pass.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  AggregatedIssue,
  ArticleReviewDecision,
  ArticleReviewDecisionStatus,
  ArticleReviewSkillScores,
  EditorialScore,
  ReviewSeverity,
  SkillReviewResult,
} from "../types";
import { loadAgent } from "../agents/load";
import {
  MULTI_REVIEW_CHILDREN,
  REVIEWER_IDS,
  buildEditorialScoreFromReviews,
  clamp,
  readArticleText,
  synthesizeFinalReview,
  type ReviewerKey,
} from "../agents/_review";
import { ensureDir, isoNow, resolvePath, writeJson } from "../store/fs";

/** Short filenames under content/reviews/<slug>/round-N/ */
export const SKILL_OUTPUT_FILES: Record<ReviewerKey, string> = {
  "reader-experience": "reader.json",
  "japanese-perspective": "japanese-perspective.json",
  "cultural-accuracy": "cultural-accuracy.json",
  "fact-source": "fact-source.json",
  "seo-search-intent": "seo.json",
  "english-naturalness": "english.json",
  "editorial-originality": "originality.json",
};

const SEVERITY_RANK: Record<ReviewSeverity, number> = {
  critical: 0,
  major: 1,
  minor: 2,
};

/** Synthesis priority (lower = more important). SEO never forces a full rewrite alone. */
const REVIEWER_PRIORITY: Record<string, number> = {
  "fact-source": 0,
  "cultural-accuracy": 1,
  "japanese-perspective": 2,
  "reader-experience": 3,
  "editorial-originality": 4,
  "english-naturalness": 5,
  "seo-search-intent": 6,
};

export interface ArticleReviewFlowInput {
  slug: string;
  title: string;
  draft_path: string;
  article?: string;
  metadata?: Record<string, unknown>;
  existing_articles?: string[];
  max_revision_rounds?: number;
}

export interface ReviewSynthesis {
  overall_score: number;
  skill_scores: ArticleReviewSkillScores;
  aggregated_issues: AggregatedIssue[];
  critical_count: number;
  major_count: number;
  minor_count: number;
  needs_revision: boolean;
  priority_notes: string[];
  scored_at: string;
}

export interface ArticleReviewFlowResult {
  decision: ArticleReviewDecision;
  editorial_score: EditorialScore;
  reviews_dir: string;
  draft_path: string;
  revision_rounds: number;
}

function reviewsRoot(slug: string): string {
  return resolvePath("content", "reviews", slug);
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function sameTheme(a: string, b: string): boolean {
  const themes: [RegExp, string][] = [
    [/always|every japanese|all japanese|generaliz|monolith|過度な一般化/i, "overgeneralization"],
    [/stereotype|mystif|unique|exotic|nationalist|hype/i, "stereotype"],
    [/research|studies|source|citation|unsupported|fact/i, "source"],
    [/faq|search intent|keyword/i, "seo"],
    [/clich|ai-|stock phrase|naturalness|formal/i, "english"],
    [/opening|hook|example|engagement|dropout|read/i, "reader"],
    [/original|wikipedia|tourism|insight/i, "originality"],
    [/japanese perspective|locals|everyday|growing up/i, "jp"],
  ];
  for (const [re, tag] of themes) {
    if (re.test(a) && re.test(b)) return true;
    if (re.test(a) && tag && b.toLowerCase().includes(tag)) return true;
  }
  return false;
}

/** Merge duplicate issues pointed at by multiple skills. */
export function aggregateIssues(reviews: SkillReviewResult[]): AggregatedIssue[] {
  type Raw = AggregatedIssue & { _tokens: Set<string> };
  const merged: Raw[] = [];

  const flat = reviews.flatMap((r) =>
    r.issues.map((i) => ({
      ...i,
      source: r.reviewer,
    }))
  );

  flat.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (REVIEWER_PRIORITY[a.source] ?? 9) - (REVIEWER_PRIORITY[b.source] ?? 9)
  );

  for (const issue of flat) {
    const tokens = tokenize(`${issue.location} ${issue.problem}`);
    const hit = merged.find((m) => {
      const locClose =
        !issue.location ||
        !m.location ||
        m.location === issue.location ||
        m.location.includes(issue.location) ||
        issue.location.includes(m.location);
      const textClose =
        jaccard(tokens, m._tokens) >= 0.35 ||
        sameTheme(issue.problem, m.problem) ||
        sameTheme(issue.problem, m.suggestion);
      return locClose && textClose;
    });

    if (hit) {
      if (!hit.sources.includes(issue.source)) hit.sources.push(issue.source);
      if (SEVERITY_RANK[issue.severity] < SEVERITY_RANK[hit.severity]) {
        hit.severity = issue.severity;
      }
      if (issue.suggestion && issue.suggestion.length > hit.suggestion.length) {
        hit.suggestion = issue.suggestion;
      }
      if (issue.problem && !hit.problem.includes(issue.problem.slice(0, 40))) {
        hit.problem = `${hit.problem} / ${issue.problem}`;
      }
    } else {
      merged.push({
        severity: issue.severity,
        location: issue.location || "general",
        problem: issue.problem,
        suggestion: issue.suggestion,
        sources: [issue.source],
        _tokens: tokens,
      });
    }
  }

  return merged.map(({ _tokens: _, ...rest }) => rest);
}

export function skillScoresFromReviews(reviews: SkillReviewResult[]): ArticleReviewSkillScores {
  const by = Object.fromEntries(reviews.map((r) => [r.reviewer, r.score])) as Record<
    string,
    number
  >;
  return {
    reader: by["reader-experience"] ?? 0,
    japanese_perspective: by["japanese-perspective"] ?? 0,
    cultural_accuracy: by["cultural-accuracy"] ?? 0,
    fact_source: by["fact-source"] ?? 0,
    seo: by["seo-search-intent"] ?? 0,
    english: by["english-naturalness"] ?? 0,
    originality: by["editorial-originality"] ?? 0,
  };
}

/**
 * Priority-weighted synthesis — NOT a plain average.
 * Critical factual / cultural weakness can veto a high mean.
 */
export function synthesizeReviews(reviews: SkillReviewResult[]): ReviewSynthesis {
  const scores = skillScoresFromReviews(reviews);
  const aggregated = aggregateIssues(reviews);

  // Soft weights for display score; vetoes applied after
  let overall = clamp(
    scores.fact_source * 0.12 +
      scores.cultural_accuracy * 0.2 +
      scores.japanese_perspective * 0.18 +
      scores.reader * 0.16 +
      scores.originality * 0.16 +
      scores.english * 0.1 +
      scores.seo * 0.08
  );

  // Priority vetoes (editor judgment)
  if (scores.fact_source < 60) overall = Math.min(overall, scores.fact_source + 5);
  if (scores.cultural_accuracy < 70) overall = Math.min(overall, scores.cultural_accuracy + 8);
  if (scores.japanese_perspective < 70) overall = Math.min(overall, scores.japanese_perspective + 8);
  if (scores.reader < 65) overall = Math.min(overall, scores.reader + 10);
  if (scores.originality < 70) overall = Math.min(overall, scores.originality + 8);
  // English / SEO: note but do not force rewrite of whole article
  if (scores.english < 60) overall = Math.min(overall, Math.max(overall - 5, scores.english + 15));
  if (scores.seo < 60) overall = Math.min(overall, Math.max(overall - 3, 72));

  const critical_count = aggregated.filter((i) => i.severity === "critical").length;
  const major_count = aggregated.filter((i) => i.severity === "major").length;
  const minor_count = aggregated.filter((i) => i.severity === "minor").length;

  if (critical_count > 0) overall = Math.min(overall, 58);

  const needs_revision = critical_count > 0 || major_count >= 2;

  const priority_notes = [...aggregated]
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        Math.min(...a.sources.map((s) => REVIEWER_PRIORITY[s] ?? 9)) -
          Math.min(...b.sources.map((s) => REVIEWER_PRIORITY[s] ?? 9))
    )
    .slice(0, 10)
    .map(
      (i) =>
        `[${i.severity}/${i.sources.join("+")}] ${i.problem} → ${i.suggestion}`
    );

  return {
    overall_score: overall,
    skill_scores: scores,
    aggregated_issues: aggregated,
    critical_count,
    major_count,
    minor_count,
    needs_revision,
    priority_notes,
    scored_at: isoNow(),
  };
}

export function decideFinalStatus(
  synthesis: ReviewSynthesis,
  revisionRounds: number,
  maxRounds: number
): ArticleReviewDecisionStatus {
  if (synthesis.critical_count > 0) {
    // After exhausting revision loop, remaining critical → FAIL
    if (revisionRounds >= maxRounds) return "FAIL";
    return "REVISE";
  }

  if (synthesis.needs_revision && revisionRounds < maxRounds) return "REVISE";

  if (synthesis.overall_score >= 85) return "PASS";
  if (synthesis.overall_score >= 75) return "HUMAN_REVIEW";
  if (revisionRounds < maxRounds) return "REVISE";
  return "FAIL";
}

/** Safe in-place revision (no invented facts). Returns applied notes. */
export function applySafeRevision(
  text: string,
  reviews: SkillReviewResult[],
  priorityNotes: string[]
): { text: string; applied: string[] } {
  let next = text;
  const applied: string[] = [];

  next = next.replace(
    /(?<!\b[Nn]ot )(?<!\b[Nn]ot all )\b(all Japanese people|every Japanese person|Japanese people always)\b/g,
    (m) => {
      applied.push(`Softened absolute claim: "${m}"`);
      return "many Japanese people";
    }
  );

  const clicheMap: [RegExp, string, string][] = [
    [/\bAt first glance,\s*/gi, "", "Removed 'At first glance'"],
    [/\bIt may seem strange, but\s*/gi, "", "Removed 'It may seem strange, but'"],
    [/\bIn many ways,\s*/gi, "", "Removed 'In many ways'"],
    [/\bFor visitors, this can be surprising\.\s*/gi, "", "Removed stock visitor-surprise line"],
    [
      /\bThis unique aspect of Japanese culture\s*/gi,
      "This habit ",
      "Rewrote unique-culture stock phrase",
    ],
    [
      /\bJapan is a country where\s*/gi,
      "In everyday Japanese life, ",
      "Removed 'Japan is a country where'",
    ],
  ];
  for (const [re, replacement, note] of clicheMap) {
    if (re.test(next)) {
      next = next.replace(re, replacement);
      applied.push(note);
    }
  }

  const fact = reviews.find((r) => r.reviewer === "fact-source");
  const needsResearchSoftening =
    !!fact &&
    ((fact.unsupported?.length ?? 0) > 0 ||
      fact.needs_source?.some((s) => /studies|researchers/i.test(s)) ||
      fact.issues.some((i) => /research|unsupported|source/i.test(i.problem)));

  if (needsResearchSoftening) {
    const pairs: [RegExp, string, string][] = [
      [
        /Studies of Japanese interaction have described/gi,
        "Observers of Japanese interaction often describe",
        "Softened unsourced studies claim",
      ],
      [
        /Japanese researchers have examined/gi,
        "Observers of Japanese language use have noted",
        "Softened unsourced researchers claim",
      ],
      [/researchers have examined/gi, "observers have noted", "Softened researchers claim"],
      [/\bit is said that\b/gi, "some people say that", "Softened hearsay phrasing"],
    ];
    for (const [re, replacement, note] of pairs) {
      if (re.test(next)) {
        next = next.replace(re, replacement);
        applied.push(note);
      }
    }
  }

  if (!/## FAQ/i.test(next) && /FAQ/i.test(priorityNotes.join(" "))) {
    applied.push("Skipped auto-adding FAQ (would invent content); flagged for editor");
  }

  return { text: next, applied };
}

async function runSevenSkillsParallel(payload: {
  slug: string;
  title: string;
  draft_path: string;
  round: number;
}): Promise<SkillReviewResult[]> {
  const results = await Promise.all(
    MULTI_REVIEW_CHILDREN.map(async (agentId) => {
      const agent = await loadAgent(agentId);
      const result = await agent.run(
        {
          job: {
            id: `flow_${agentId}_${payload.round}`,
            type: "quality",
            agent_id: agentId,
            status: "running",
            created_at: isoNow(),
            updated_at: isoNow(),
            retry_count: 0,
            max_retries: 0,
            dependencies: [],
            payload,
            priority: 100,
            estimated_cost: 0,
            actual_cost: 0,
            tokens: 0,
            duration_ms: 0,
          },
          workspaceRoot: resolvePath(),
          now: new Date(),
        },
        {
          slug: payload.slug,
          title: payload.title,
          draft_path: payload.draft_path,
          revision_round: payload.round - 1,
        }
      );
      return result.output?.review as SkillReviewResult;
    })
  );
  return results.filter(Boolean);
}

function writeRoundArtifacts(
  slug: string,
  round: number,
  reviews: SkillReviewResult[],
  title: string
): void {
  const dir = path.join(reviewsRoot(slug), `round-${round}`);
  ensureDir(dir);
  for (const review of reviews) {
    const key = review.reviewer as ReviewerKey;
    const file = SKILL_OUTPUT_FILES[key] ?? `${review.reviewer}.json`;
    writeJson(path.join(dir, file), { ...review, slug, title, round, mock: true });
  }
}

function buildDecision(
  synthesis: ReviewSynthesis,
  status: ArticleReviewDecisionStatus,
  revisionRounds: number
): ArticleReviewDecision {
  const critical_issues = synthesis.aggregated_issues.filter((i) => i.severity === "critical");
  const major_issues = synthesis.aggregated_issues.filter((i) => i.severity === "major");
  const minor_issues = synthesis.aggregated_issues.filter((i) => i.severity === "minor");

  let final_summary: string;
  switch (status) {
    case "PASS":
      final_summary =
        "Article Review passed. Everyday Japan editorial standards hold; ready to publish after light human glance if desired.";
      break;
    case "HUMAN_REVIEW":
      final_summary =
        "Score is acceptable but needs human confirmation before publish (borderline quality or residual non-critical issues).";
      break;
    case "REVISE":
      final_summary =
        "Revision required: critical issues or multiple major issues remain. Do not publish yet.";
      break;
    case "FAIL":
      final_summary =
        "Failed Article Review. Critical issues remain after revision loop — human must intervene before publish.";
      break;
  }

  return {
    status,
    overall_score: synthesis.overall_score,
    critical_issues,
    major_issues,
    minor_issues,
    revision_rounds: revisionRounds,
    skill_scores: synthesis.skill_scores,
    final_summary,
  };
}

/**
 * Full Article Review Flow (Layer 3).
 * One call: parallel skills → synthesis → revision loop → final decision + artifacts.
 */
export async function runArticleReviewFlow(
  input: ArticleReviewFlowInput
): Promise<ArticleReviewFlowResult> {
  const maxRounds = input.max_revision_rounds ?? 2;
  const slug = input.slug;
  const title = input.title;
  const draftRel = input.draft_path;
  const draftAbs = resolvePath(draftRel);

  ensureDir(path.dirname(draftAbs));
  if (input.article && !fs.existsSync(draftAbs)) {
    fs.writeFileSync(draftAbs, input.article, "utf8");
  }

  const root = reviewsRoot(slug);
  ensureDir(root);

  let revisionRounds = 0;
  let lastReviews: SkillReviewResult[] = [];
  let lastSynthesis: ReviewSynthesis | null = null;
  let decision: ArticleReviewDecision | null = null;

  // Round 1 always runs; then up to maxRounds revisions each followed by re-review
  for (let round = 1; round <= maxRounds + 1; round++) {
    lastReviews = await runSevenSkillsParallel({
      slug,
      title,
      draft_path: draftRel,
      round,
    });
    writeRoundArtifacts(slug, round, lastReviews, title);

    lastSynthesis = synthesizeReviews(lastReviews);
    writeJson(path.join(root, `synthesis-${round}.json`), {
      ...lastSynthesis,
      slug,
      title,
      round,
      existing_articles_count: input.existing_articles?.length ?? 0,
      metadata: input.metadata ?? null,
    });

    const status = decideFinalStatus(lastSynthesis, revisionRounds, maxRounds);

    if (status === "REVISE" && revisionRounds < maxRounds) {
      const text = readArticleText(slug, draftRel);
      const { text: revised, applied } = applySafeRevision(
        text,
        lastReviews,
        lastSynthesis.priority_notes
      );
      revisionRounds += 1;
      fs.writeFileSync(draftAbs, revised, "utf8");
      writeJson(path.join(root, `revision-${revisionRounds}.json`), {
        slug,
        title,
        revision_round: revisionRounds,
        applied,
        unchanged: revised === text,
        from_round: round,
        at: isoNow(),
        trigger: {
          critical: lastSynthesis.critical_count,
          major: lastSynthesis.major_count,
        },
      });
      continue;
    }

    decision = buildDecision(lastSynthesis, status === "REVISE" ? "FAIL" : status, revisionRounds);
    break;
  }

  if (!decision || !lastSynthesis) {
    throw new Error("Article Review Flow produced no decision");
  }

  // Map to legacy EditorialScore for dashboard / human gate
  const legacyFinal = synthesizeFinalReview(lastReviews, revisionRounds);
  legacyFinal.overall_score = decision.overall_score;
  legacyFinal.status =
    decision.status === "PASS"
      ? "pass"
      : decision.status === "FAIL"
        ? "fail"
        : "revise";
  legacyFinal.publish_recommendation = decision.final_summary;

  const editorial_score = buildEditorialScoreFromReviews(lastReviews, legacyFinal);
  editorial_score.overall = decision.overall_score;
  editorial_score.article_review = decision;
  editorial_score.revision_round = revisionRounds;

  const assetsDir = resolvePath("assets", slug);
  ensureDir(assetsDir);
  writeJson(path.join(assetsDir, "editorial-score.json"), {
    ...editorial_score,
    slug,
    title,
    mock: true,
  });

  writeJson(path.join(root, "final-review.json"), {
    ...decision,
    slug,
    title,
    scored_at: isoNow(),
    skill_agents: MULTI_REVIEW_CHILDREN,
    reviewer_ids: REVIEWER_IDS,
  });

  return {
    decision,
    editorial_score,
    reviews_dir: path.relative(resolvePath(), root),
    draft_path: draftRel,
    revision_rounds: revisionRounds,
  };
}

export function listPublishedSlugs(): string[] {
  const dir = resolvePath("articles");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
