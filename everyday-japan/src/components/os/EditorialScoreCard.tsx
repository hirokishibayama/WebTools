import type {
  ArticleReviewDecision,
  EditorialScore,
  SkillReviewResult,
} from "../../../os/types";

const SKILL_LABELS: { key: keyof ArticleReviewDecision["skill_scores"]; label: string }[] = [
  { key: "reader", label: "Reader Experience" },
  { key: "japanese_perspective", label: "Japanese Perspective" },
  { key: "cultural_accuracy", label: "Cultural Accuracy" },
  { key: "fact_source", label: "Fact & Source" },
  { key: "seo", label: "SEO & Search Intent" },
  { key: "english", label: "English Naturalness" },
  { key: "originality", label: "Editorial Originality" },
];

function statusTone(status: string): string {
  if (status === "PASS" || status === "pass") return "text-emerald-700";
  if (status === "HUMAN_REVIEW") return "text-amber-700";
  if (status === "FAIL" || status === "fail") return "text-red-700";
  return "text-orange-700";
}

function severityClass(severity: string): string {
  if (severity === "critical") return "text-red-700";
  if (severity === "major") return "text-amber-700";
  return "text-[var(--muted)]";
}

function ReviewDetail({ review }: { review: SkillReviewResult }) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">
        {review.reviewer} · {review.score}/100 · {review.status}
      </summary>
      <div className="mt-3 space-y-3 text-xs leading-relaxed text-[var(--muted)]">
        {review.strengths?.length > 0 && (
          <div>
            <p className="font-semibold text-[var(--ink)]">Strengths</p>
            <ul className="mt-1 list-disc pl-4">
              {review.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {review.issues?.length > 0 && (
          <div>
            <p className="font-semibold text-[var(--ink)]">Issues & revisions</p>
            <ul className="mt-1 space-y-2">
              {review.issues.map((issue, idx) => (
                <li key={`${issue.location}-${idx}`} className="border-l-2 border-slate-300 pl-2">
                  <p className={`font-medium ${severityClass(issue.severity)}`}>
                    [{issue.severity}] {issue.location || "general"}
                  </p>
                  <p className="text-[var(--ink)]">{issue.problem}</p>
                  <p>→ {issue.suggestion}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function EditorialScoreCard({ score }: { score: EditorialScore | null }) {
  if (!score) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-[var(--muted)]">
        Editorial Score not available yet.
      </div>
    );
  }

  const article = score.article_review;
  const multi = score.multi_reviews ?? [];
  const status = article?.status ?? (score.verdict === "pass" ? "PASS" : score.verdict === "fail" ? "FAIL" : "REVISE");
  const overall = article?.overall_score ?? score.overall;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-300/80 bg-white/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Article Review
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className={`text-lg font-semibold ${statusTone(status)}`}>Status: {status}</p>
            {article?.final_summary && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                {article.final_summary}
              </p>
            )}
            {article && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Critical {article.critical_issues.length} · Major {article.major_issues.length} ·
                Minor {article.minor_issues.length}
                {article.revision_rounds > 0
                  ? ` · revision rounds ${article.revision_rounds}`
                  : ""}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Score</p>
            <p className="text-4xl font-semibold tabular-nums text-[var(--ink)]">{overall}</p>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-slate-300/80 bg-white/80 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
          View 7 Review Skill results
        </summary>

        <div className="mt-4 space-y-4">
          {article?.skill_scores && (
            <ul className="space-y-2">
              {SKILL_LABELS.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0"
                >
                  <span>{row.label}</span>
                  <span className="tabular-nums font-medium">
                    {article.skill_scores[row.key]}/100
                  </span>
                </li>
              ))}
            </ul>
          )}

          {article && (article.critical_issues.length > 0 || article.major_issues.length > 0) && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold">Aggregated issues</p>
              <ul className="mt-1 space-y-1">
                {[...article.critical_issues, ...article.major_issues].slice(0, 8).map((issue, i) => (
                  <li key={`${issue.problem}-${i}`}>
                    [{issue.severity}] ({issue.sources.join("+")}) {issue.problem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {multi.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Per-skill detail
              </p>
              {multi.map((review) => (
                <ReviewDetail key={review.reviewer} review={review} />
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
