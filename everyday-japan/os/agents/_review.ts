import fs from "node:fs";
import path from "node:path";
import type {
  AgentId,
  AgentResult,
  EditorialScore,
  FinalEditorialReview,
  ReviewStatus,
  SkillReviewResult,
} from "../types";
import { ensureDir, isoNow, readJson, resolvePath, writeJson } from "../store/fs";
import { loadPrompt } from "./prompt";

export const MULTI_REVIEW_CHILDREN: AgentId[] = [
  "review-reader-experience",
  "review-japanese-perspective",
  "review-cultural-accuracy",
  "review-fact-source",
  "review-seo-intent",
  "review-english-naturalness",
  "review-editorial-originality",
];

export const REVIEWER_IDS = {
  "review-reader-experience": "reader-experience",
  "review-japanese-perspective": "japanese-perspective",
  "review-cultural-accuracy": "cultural-accuracy",
  "review-fact-source": "fact-source",
  "review-seo-intent": "seo-search-intent",
  "review-english-naturalness": "english-naturalness",
  "review-editorial-originality": "editorial-originality",
} as const;

export type ReviewerKey = (typeof REVIEWER_IDS)[keyof typeof REVIEWER_IDS];

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function statusFromScore(score: number, hasCritical = false): ReviewStatus {
  if (hasCritical || score < 60) return "fail";
  if (score < 80) return "revise";
  return "pass";
}

export function readArticleText(slug: string, draftRel?: string): string {
  const candidates = [
    draftRel ? resolvePath(draftRel) : null,
    resolvePath("assets", slug, "draft.md"),
    resolvePath("articles", `${slug}.md`),
    resolvePath("content", "articles", slug, "article.md"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  return "";
}

function bodyOnly(text: string): string {
  return text.replace(/^---[\s\S]*?---\n*/, "");
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

type ReviewFn = (text: string, slug: string) => Omit<SkillReviewResult, "prompt_version" | "scored_at" | "duration_ms">;

const AI_CLICHES = [
  /japan is a country where/gi,
  /in many ways/gi,
  /this unique aspect of japanese culture/gi,
  /for visitors, this can be surprising/gi,
  /at first glance/gi,
  /it may seem strange, but/gi,
  /deeply rooted in japanese culture/gi,
  /plays an important role in/gi,
];

function reviewReaderExperience(text: string, _slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const opening = body.slice(0, 700);
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  let score = 72;

  if (/\?/.test(opening) || /notice|unusual|surprising|often say|does not always/i.test(opening)) {
    score += 10;
    strengths.push("Opening poses a clear visitor question or observation");
  } else {
    score -= 12;
    issues.push({
      severity: "major",
      location: "introduction",
      problem: "Opening does not make the reader’s question obvious",
      suggestion: "Start with what visitors notice and why the article answers it",
    });
  }

  if (/helps visitors|useful|when (you|visitors)|in japan/i.test(opening)) {
    score += 6;
    strengths.push("Reading benefit is clear early");
  }

  if (countMatches(body, /for example|imagine that|you might|you can use/gi) >= 3) {
    score += 8;
    strengths.push("Concrete examples help readers stay engaged");
  } else {
    score -= 8;
    issues.push({
      severity: "major",
      location: "body",
      problem: "Not enough concrete examples for a foreign reader",
      suggestion: "Add 2–3 everyday scenes a visitor can picture or use",
    });
  }

  const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 40);
  const similar = paras.filter((p) => /sumimasen.*(apology|excuse|thank)/i.test(p)).length;
  if (similar > 6) {
    score -= 10;
    issues.push({
      severity: "minor",
      location: "middle sections",
      problem: "Some sections restate the same apology/excuse/thanks idea",
      suggestion: "Tighten repeated explanations; keep one strong example per function",
    });
  }

  if (/## When Visitors Should|## FAQ|## Practical/i.test(body)) {
    score += 6;
    strengths.push("Practical takeaway section gives a reason to finish");
  } else {
    issues.push({
      severity: "minor",
      location: "ending",
      problem: "Weak practical payoff for travelers",
      suggestion: "End with clear visitor guidance tied to real situations",
    });
  }

  if (/なるほど|makes sense|both reactions make sense|that explanation is too simple/i.test(body)) {
    score += 4;
    strengths.push("Leaves the reader with a clearer mental model");
  }

  score = clamp(score);
  return {
    reviewer: "reader-experience",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

function reviewJapanesePerspective(text: string, _slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  let score = 55;

  const signals = [
    /for (many )?japanese (people|speakers|readers)/i,
    /growing up in japan/i,
    /locals (rarely|often)/i,
    /japanese people often/i,
    /absorbed through ordinary life/i,
    /invisible to japanese/i,
    /at (home|school|work|the office)/i,
  ].filter((re) => re.test(body)).length;

  score += signals * 8;
  if (signals >= 3) strengths.push("Explains everyday Japanese experience, not only tourist observation");
  else {
    issues.push({
      severity: "major",
      location: "body",
      problem: "Reads like a generic tourism explanation without local everyday sense",
      suggestion: "Add how Japanese people actually experience the habit in daily life",
    });
  }

  if (/wikipedia|traditionally, japan|japan is known for/i.test(body)) {
    score -= 15;
    issues.push({
      severity: "major",
      location: "tone",
      problem: "Touches generic encyclopedia / tourism framing",
      suggestion: "Replace broad national claims with specific social situations",
    });
  }

  if (/\bwhen i was (growing up|a child|young)\b/i.test(body)) {
    score -= 30;
    issues.push({
      severity: "critical",
      location: "body",
      problem: "Invented first-person Japanese anecdote",
      suggestion: "Remove fabricated personal stories; use observed social patterns instead",
    });
  }

  if (/(?<!\bnot )(?<!\bNot )\bevery japanese person\b|\ball japanese people\b|\bjapanese people always\b/i.test(body)) {
    score -= 18;
    issues.push({
      severity: "critical",
      location: "wording",
      problem: "Over-generalizes what Japanese people think or do",
      suggestion: "Use 'many', 'often', 'in some settings' and note variation",
    });
  }

  if (/age, setting, region|not every japanese|usage changes/i.test(body)) {
    score += 8;
    strengths.push("Avoids treating Japanese people as a monolith");
  }

  if (/background|why|underlying|social|shared logic/i.test(body)) {
    score += 5;
    strengths.push("Connects habit to social logic, not only surface manners");
  }

  score = clamp(score);
  return {
    reviewer: "japanese-perspective",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

function reviewCulturalAccuracy(text: string, _slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const lower = body.toLowerCase();
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  let score = 78;

  if (/japan is (the )?best|most polite country|japan is amazing|japan is unique because/i.test(body)) {
    score -= 25;
    issues.push({
      severity: "critical",
      location: "tone",
      problem: "Exoticizing or nationalist simplification of Japan",
      suggestion: "Describe specific practices without 'Japan is unique/best' framing",
    });
  }

  if (/(?<!\bnot )(?<!\bNot )\bevery japanese person\b|\ball japanese people\b|\bjapanese people always\b/i.test(lower)) {
    score -= 20;
    issues.push({
      severity: "critical",
      location: "wording",
      problem: "'All Japanese people…' style absolute claim",
      suggestion: "Qualify with setting, generation, or frequency",
    });
  }

  if (/however|not always|can differ|depends|usually|often|not every/i.test(lower)) {
    score += 8;
    strengths.push("Shows nuance and limits instead of national personality theory");
  }

  if (/region|generation|age|personality|setting/i.test(lower)) {
    score += 6;
    strengths.push("Acknowledges regional / generational / situational variation");
  } else {
    issues.push({
      severity: "minor",
      location: "body",
      problem: "Little acknowledgment of regional or generational difference",
      suggestion: "Note that usage varies by age, setting, and region where relevant",
    });
  }

  if (/mysterious|inscrutable|ancient tradition|spiritual essence/i.test(lower)) {
    score -= 15;
    issues.push({
      severity: "major",
      location: "tone",
      problem: "Mystifies Japanese culture for foreign readers",
      suggestion: "Explain as ordinary social language, not exotic tradition",
    });
  }

  if (/that explanation is too simple|should not be exaggerated/i.test(lower)) {
    score += 6;
    strengths.push("Actively resists oversimplified cultural explanations");
  }

  score = clamp(score);
  return {
    reviewer: "cultural-accuracy",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

function reviewFactSource(text: string, _slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  const verified: string[] = [];
  const questionable: string[] = [];
  const unsupported: string[] = [];
  const needs_source: string[] = [];
  let score = 75;

  if (/japan national tourism organization|jnto/i.test(body)) {
    verified.push("JNTO language guidance citation is checkable");
    score += 8;
    strengths.push("References a concrete institutional source");
  }

  if (/studies of japanese interaction|researchers have examined/i.test(body)) {
    needs_source.push("Mentions studies/researchers without a specific citation");
    score -= 6;
    issues.push({
      severity: "major",
      location: "research claims",
      problem: "Research is alluded to without a verifiable source",
      suggestion: "Name the study/author or soften to 'observers of Japanese interaction note…'",
    });
  }

  if (/because japanese (society|people|culture)/i.test(body) && /because/i.test(body)) {
    // Ignore cases where the article is rebutting the causal myth
    const rebutted =
      /that explanation is too simple|should not be exaggerated|visitors sometimes conclude/i.test(
        body
      );
    const strongCausal = countMatches(body, /japanese people .+ because|because japanese society/gi);
    if (strongCausal > 0 && !rebutted) {
      questionable.push("Strong causal claims about national character");
      score -= 10;
      issues.push({
        severity: "major",
        location: "causal claims",
        problem: "Treats national cause as settled fact",
        suggestion: "Prefer 'one reason may be…' / 'for many people…' wording",
      });
    } else if (rebutted) {
      strengths.push("Challenges oversimplified causal myths about Japan");
      score += 4;
    }
  }

  if (/said to be|it is said|are said to/i.test(body)) {
    unsupported.push("Hearsay phrasing ('it is said') without evidence");
    score -= 5;
    issues.push({
      severity: "minor",
      location: "wording",
      problem: "'It is said' style claims weaken reliability",
      suggestion: "Either cite a source or rewrite as careful observation",
    });
  }

  if (/may be|often|usually|can|one convenient|not every/i.test(body)) {
    score += 6;
    strengths.push("Separates observation from hard fact with careful modality");
  }

  const bodyNums = bodyOnly(text);
  const hasStats = /\b\d{2,}%|\b\d+ (percent|people|yen)\b/.test(bodyNums);
  const hasYearClaim = /\bin \d{4}\b|\bsince \d{4}\b|\bby \d{4}\b/.test(bodyNums);
  if (hasStats || hasYearClaim) {
    needs_source.push("Numeric claims present — verify against primary sources before publish");
    issues.push({
      severity: "minor",
      location: "numbers",
      problem: "Numbers appear without an inline source trail",
      suggestion: "Attach a source or remove precise figures if unverified",
    });
  }

  score = clamp(score);
  return {
    reviewer: "fact-source",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    verified,
    questionable,
    unsupported,
    needs_source,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

function reviewSeoIntent(text: string, slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  let score = 68;

  const seo = readJson<{
    seo_title?: string;
    meta_description?: string;
    tags?: string[];
    target_keyword?: string;
  }>(resolvePath("assets", slug, "seo.json"), {});

  const titleMatch = text.match(/^title:\s*"?([^"\n]+)"?/m);
  const title = seo.seo_title || titleMatch?.[1] || "";
  if (/why|sumimasen|japanese/i.test(title)) {
    score += 10;
    strengths.push("Title matches likely search intent");
  } else {
    issues.push({
      severity: "major",
      location: "title",
      problem: "Title may not match the search question",
      suggestion: "Align title with the visitor question the article answers",
    });
  }

  const opening = body.slice(0, 600);
  if (/sumimasen|sorry|excuse me|thank you/i.test(opening)) {
    score += 8;
    strengths.push("Introduction answers the search question quickly");
  }

  const h2s = countMatches(body, /^## /gm);
  if (h2s >= 5 && h2s <= 12) {
    score += 6;
    strengths.push("H2 structure covers related questions naturally");
  } else if (h2s < 4) {
    score -= 8;
    issues.push({
      severity: "major",
      location: "structure",
      problem: "Heading structure is too thin for search intent coverage",
      suggestion: "Add clear H2s for meanings, why, and visitor usage",
    });
  }

  const keywordHits = countMatches(body.toLowerCase(), /sumimasen/g);
  if (keywordHits > 80) {
    score -= 12;
    issues.push({
      severity: "major",
      location: "keyword usage",
      problem: "Possible keyword stuffing",
      suggestion: "Reduce repeated keyword mentions; prefer pronouns and variation",
    });
  } else if (keywordHits >= 8) {
    score += 5;
  }

  if (/## FAQ/i.test(body)) {
    score += 8;
    strengths.push("FAQ / related questions section present");
  } else {
    score -= 4;
    issues.push({
      severity: "minor",
      location: "FAQ",
      problem: "No FAQ section for related search questions",
      suggestion: "Add a short FAQ answering adjacent queries",
    });
  }

  if (seo.meta_description && seo.meta_description.length >= 110) score += 5;
  if ((seo.tags?.length ?? 0) >= 3) score += 3;

  const links = readJson<{ suggestions?: unknown[] }>(
    resolvePath("assets", slug, "internal-links.json"),
    {}
  );
  if ((links.suggestions?.length ?? 0) > 0) {
    score += 4;
    strengths.push("Internal link suggestions available");
  }

  score = clamp(score);
  return {
    reviewer: "seo-search-intent",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

function reviewEnglishNaturalness(text: string, _slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  let score = 82;

  let clicheHits = 0;
  for (const re of AI_CLICHES) {
    clicheHits += countMatches(body, re);
  }
  if (clicheHits >= 3) {
    score -= 18;
    issues.push({
      severity: "major",
      location: "phrasing",
      problem: `AI-style stock phrases appear ${clicheHits} times`,
      suggestion: "Replace stock openers with concrete scenes and direct wording",
    });
  } else if (clicheHits === 0) {
    score += 6;
    strengths.push("Avoids common AI travel-writing clichés");
  } else {
    score -= 6;
    issues.push({
      severity: "minor",
      location: "phrasing",
      problem: "A few AI-leaning stock phrases remain",
      suggestion: "Rewrite remaining stock phrases into specific observations",
    });
  }

  const sentenceStarts = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().split(/\s+/)[0]?.toLowerCase() ?? "")
    .filter(Boolean);
  const thisCount = sentenceStarts.filter((w) => w === "this").length;
  if (thisCount >= 8) {
    score -= 8;
    issues.push({
      severity: "minor",
      location: "syntax",
      problem: "Many sentences start with 'This…'",
      suggestion: "Vary sentence openings; lead with actors or concrete details",
    });
  }

  if (/moreover|furthermore|in conclusion|it is important to note/i.test(body)) {
    score -= 10;
    issues.push({
      severity: "major",
      location: "tone",
      problem: "Overly formal / essay-like transitions",
      suggestion: "Use plainer connective tissue between scenes",
    });
  } else {
    strengths.push("Tone stays conversational rather than academic");
  }

  if (/short sentences|the important word is|both are correct/i.test(body)) {
    strengths.push("Uses punchy, natural editorial rhythm in places");
    score += 4;
  }

  score = clamp(score);
  return {
    reviewer: "english-naturalness",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

function reviewEditorialOriginality(text: string, _slug: string): ReturnType<ReviewFn> {
  const body = bodyOnly(text);
  const issues: SkillReviewResult["issues"] = [];
  const strengths: string[] = [];
  let score = 60;

  if (/phrasebook|dictionary entry matters less|translation misses/i.test(body)) {
    score += 12;
    strengths.push("Goes beyond dictionary/tourism-site definitions");
  }

  if (/invisible to japanese|different distances|national personality theory/i.test(body)) {
    score += 12;
    strengths.push("Offers a perspective visitors rarely get elsewhere");
  } else {
    issues.push({
      severity: "major",
      location: "angle",
      problem: "Missing the 'I didn’t know that' Everyday Japan insight",
      suggestion: "Add a local blind-spot: what Japanese people don’t notice that visitors do",
    });
  }

  if (/growing up in japan|absorbed through ordinary life/i.test(body)) {
    score += 8;
    strengths.push("Includes Japanese-side lived context");
  }

  if (/japan is known for|polite culture|unique culture/i.test(body)) {
    score -= 15;
    issues.push({
      severity: "major",
      location: "conclusion",
      problem: "Falls into generic Japan-culture conclusions",
      suggestion: "End on a specific usable insight, not 'Japan is polite'",
    });
  }

  if (/compare|english speakers say|many societies have/i.test(body)) {
    score += 6;
    strengths.push("Uses comparison instead of exotic uniqueness");
  }

  const h2s = countMatches(body, /^## /gm);
  if (h2s >= 7) {
    // long articles can still be original; no penalty
  }

  if (issues.length === 0 && score >= 80) {
    strengths.push("Feels like Everyday Japan rather than a recycled explainer");
  }

  score = clamp(score);
  return {
    reviewer: "editorial-originality",
    score,
    status: statusFromScore(score, issues.some((i) => i.severity === "critical")),
    strengths,
    issues,
    specific_revisions: issues.map((i) => i.suggestion),
  };
}

const REVIEWERS: Record<string, ReviewFn> = {
  "reader-experience": reviewReaderExperience,
  "japanese-perspective": reviewJapanesePerspective,
  "cultural-accuracy": reviewCulturalAccuracy,
  "fact-source": reviewFactSource,
  "seo-search-intent": reviewSeoIntent,
  "english-naturalness": reviewEnglishNaturalness,
  "editorial-originality": reviewEditorialOriginality,
};

export function runSkillReviewHeuristics(
  reviewer: ReviewerKey,
  text: string,
  slug: string
): Omit<SkillReviewResult, "prompt_version" | "scored_at" | "duration_ms"> {
  return REVIEWERS[reviewer](text, slug);
}

export async function runMultiReviewSkill(opts: {
  agentId: AgentId;
  reviewer: ReviewerKey;
  promptPath: string;
  input: Record<string, unknown>;
}): Promise<AgentResult> {
  const started = Date.now();
  const prompt = loadPrompt(opts.promptPath);
  const slug = String(opts.input.slug ?? "untitled");
  const title = String(opts.input.title ?? slug);
  const draftRel = String(opts.input.draft_path ?? path.join("assets", slug, "draft.md"));
  const text = readArticleText(slug, draftRel);
  const review = runSkillReviewHeuristics(opts.reviewer, text, slug);
  const duration_ms = Date.now() - started;

  const result: SkillReviewResult = {
    ...review,
    duration_ms,
    prompt_version: prompt.version,
    scored_at: isoNow(),
  };

  const dir = resolvePath("assets", slug, "reviews");
  ensureDir(dir);
  const outPath = path.join(dir, `${opts.reviewer}.json`);
  writeJson(outPath, { ...result, slug, title, mock: true });

  return {
    ok: true,
    output: {
      slug,
      title,
      reviewer: opts.reviewer,
      review: result,
      review_path: path.relative(resolvePath(), outPath),
      draft_path: draftRel,
      writing_parent_id: opts.input.writing_parent_id,
      quality_parent_id: opts.input.quality_parent_id,
      revision_round: opts.input.revision_round ?? 0,
      fact_check_path: opts.input.fact_check_path,
    },
    artifacts: [{ kind: "skill_review", path: path.relative(resolvePath(), outPath) }],
    enqueue: [],
    prompt_versions: { [opts.agentId]: prompt.version },
    cost: { actual_cost: 0.01, tokens: 800, duration_ms: Math.max(duration_ms, 50) },
    quality_score: result.score,
  };
}

export function loadSkillReviews(slug: string): SkillReviewResult[] {
  const dir = resolvePath("assets", slug, "reviews");
  if (!fs.existsSync(dir)) return [];
  return Object.values(REVIEWER_IDS)
    .map((id) => readJson<SkillReviewResult | null>(path.join(dir, `${id}.json`), null))
    .filter((r): r is SkillReviewResult => !!r && typeof r.score === "number");
}

/** Final reviewer: weighted judgment, NOT a plain average. */
export function synthesizeFinalReview(
  reviews: SkillReviewResult[],
  revisionRound: number
): FinalEditorialReview {
  const by = Object.fromEntries(reviews.map((r) => [r.reviewer, r])) as Record<
    string,
    SkillReviewResult
  >;

  const reader = by["reader-experience"]?.score ?? 70;
  const jp = by["japanese-perspective"]?.score ?? 70;
  const cultural = by["cultural-accuracy"]?.score ?? 70;
  const fact = by["fact-source"]?.score ?? 70;
  const seo = by["seo-search-intent"]?.score ?? 70;
  const english = by["english-naturalness"]?.score ?? 70;
  const originality = by["editorial-originality"]?.score ?? 70;

  // Everyday Japan weights: originality + JP perspective + cultural accuracy matter most
  let overall = clamp(
    originality * 0.22 +
      jp * 0.2 +
      cultural * 0.18 +
      reader * 0.15 +
      fact * 0.1 +
      english * 0.08 +
      seo * 0.07
  );

  const allIssues = reviews.flatMap((r) =>
    r.issues.map((i) => ({ ...i, reviewer: r.reviewer }))
  );
  const hasCritical = allIssues.some((i) => i.severity === "critical");
  const hasMajorFact = allIssues.some(
    (i) =>
      (i.severity === "critical" || i.severity === "major") &&
      (i.reviewer === "fact-source" || i.reviewer === "cultural-accuracy")
  );
  const weakOriginality = originality < 70;
  const weakReader = reader < 70;
  const weakCulture = cultural < 65;

  // Soften overall when key EJ dimensions are weak (even if average looks fine)
  if (weakOriginality) overall = Math.min(overall, clamp(originality + 8));
  if (weakCulture) overall = Math.min(overall, clamp(cultural + 5));
  if (hasCritical) overall = Math.min(overall, 58);

  let status: ReviewStatus = statusFromScore(overall, hasCritical);
  if (weakOriginality && overall >= 80) status = "revise";
  if (weakReader && reader < 65) status = status === "fail" ? "fail" : "revise";
  if (hasMajorFact && status === "pass") status = "revise";
  if (hasCritical) status = "fail";
  // Only hard-fail on critical fact/culture — major alone stays revise
  if (allIssues.some((i) => i.severity === "critical" && (i.reviewer === "fact-source" || i.reviewer === "cultural-accuracy"))) {
    status = "fail";
  }

  const priority_revisions = allIssues
    .filter((i) => i.severity === "critical" || i.severity === "major")
    .sort((a, b) => (a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : 0))
    .slice(0, 8)
    .map((i) => `[${i.severity}/${i.reviewer}] ${i.problem} → ${i.suggestion}`);

  // Pull specific_revisions if few issues
  if (priority_revisions.length < 3) {
    for (const r of reviews) {
      for (const s of r.specific_revisions ?? []) {
        if (priority_revisions.length >= 6) break;
        priority_revisions.push(`[${r.reviewer}] ${s}`);
      }
    }
  }

  let publish_recommendation: string;
  if (status === "pass") {
    publish_recommendation =
      "Ready for human review. Multi Review found no blocking issues; Everyday Japan differentiation holds.";
  } else if (status === "revise") {
    publish_recommendation = weakOriginality
      ? "Do not publish yet. Strengthen Everyday Japan originality and local insight before human review."
      : "Needs targeted revision on major issues, then re-review.";
  } else {
    publish_recommendation =
      "Not publishable. Critical cultural/factual or structural problems must be fixed first.";
  }

  return {
    overall_score: overall,
    status,
    priority_revisions,
    publish_recommendation,
    scored_at: isoNow(),
    revision_round: revisionRound,
  };
}

export function buildEditorialScoreFromReviews(
  reviews: SkillReviewResult[],
  final: FinalEditorialReview
): EditorialScore {
  const by = Object.fromEntries(reviews.map((r) => [r.reviewer, r])) as Record<
    string,
    SkillReviewResult
  >;

  const notes: EditorialScore["notes"] = {
    cultural_accuracy: by["cultural-accuracy"]?.issues.map((i) => i.problem) ?? [],
    japanese_perspective: by["japanese-perspective"]?.issues.map((i) => i.problem) ?? [],
    reader_engagement: by["reader-experience"]?.issues.map((i) => i.problem) ?? [],
    seo_quality: by["seo-search-intent"]?.issues.map((i) => i.problem) ?? [],
    fact_source: by["fact-source"]?.issues.map((i) => i.problem) ?? [],
    english_naturalness: by["english-naturalness"]?.issues.map((i) => i.problem) ?? [],
    editorial_originality: by["editorial-originality"]?.issues.map((i) => i.problem) ?? [],
  };

  // Map strengths into notes when no issues
  for (const [key, reviewer] of [
    ["cultural_accuracy", "cultural-accuracy"],
    ["japanese_perspective", "japanese-perspective"],
    ["reader_engagement", "reader-experience"],
    ["seo_quality", "seo-search-intent"],
    ["fact_source", "fact-source"],
    ["english_naturalness", "english-naturalness"],
    ["editorial_originality", "editorial-originality"],
  ] as const) {
    if (!notes[key]?.length) {
      notes[key] = by[reviewer]?.strengths?.slice(0, 2) ?? [];
    }
  }

  return {
    cultural_accuracy: by["cultural-accuracy"]?.score ?? 0,
    japanese_perspective: by["japanese-perspective"]?.score ?? 0,
    reader_engagement: by["reader-experience"]?.score ?? 0,
    seo_quality: by["seo-search-intent"]?.score ?? 0,
    fact_source: by["fact-source"]?.score ?? 0,
    english_naturalness: by["english-naturalness"]?.score ?? 0,
    editorial_originality: by["editorial-originality"]?.score ?? 0,
    overall: final.overall_score,
    notes,
    verdict: final.status,
    scored_at: final.scored_at,
    multi_reviews: reviews,
    final_review: final,
    revision_round: final.revision_round,
  };
}

export function enqueueMultiReviewChildren(payload: {
  slug: string;
  title: string;
  draft_path: unknown;
  fact_check_path?: unknown;
  writing_parent_id?: unknown;
  quality_parent_id: string;
  revision_round?: number;
}): import("../types").EnqueueRequest[] {
  const round = payload.revision_round ?? 0;
  return MULTI_REVIEW_CHILDREN.map((agent_id) => ({
    type: "quality" as const,
    agent_id,
    parent_id: payload.quality_parent_id,
    payload: {
      slug: payload.slug,
      title: payload.title,
      draft_path: payload.draft_path,
      fact_check_path: payload.fact_check_path,
      writing_parent_id: payload.writing_parent_id,
      quality_parent_id: payload.quality_parent_id,
      revision_round: round,
    },
    estimated_cost: 0.01,
    idempotency_key: `multi-review:${agent_id}:${payload.slug}:r${round}`,
    priority: 80,
  }));
}
