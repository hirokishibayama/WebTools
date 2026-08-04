"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/events";
import type { ProofreadMode, ProofreadResult } from "@/lib/ai/provider";

type Tab = "corrected" | "business" | "keigo" | "issues";

type Quota = {
  limit: number;
  remaining: number;
  hourlyLimit: number;
  maxChars: number;
};

const TABS_PROOFREAD: { id: Tab; label: string }[] = [
  { id: "corrected", label: "自然な修正" },
  { id: "business", label: "ビジネス向け" },
  { id: "keigo", label: "敬語チェック" },
  { id: "issues", label: "指摘一覧" },
];

const TABS_TRANSLATE: { id: Tab; label: string }[] = [
  { id: "corrected", label: "自然な英語" },
  { id: "business", label: "ビジネス英語" },
  { id: "keigo", label: "丁寧な英語" },
  { id: "issues", label: "訳し分けメモ" },
];

export default function AiProofreadTool() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeMode, setActiveMode] = useState<ProofreadMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProofreadResult | null>(null);
  const [tab, setTab] = useState<Tab>("corrected");
  const [copied, setCopied] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);

  const resultMode = result?.mode ?? "proofread";
  const tabs = resultMode === "translate-en" ? TABS_TRANSLATE : TABS_PROOFREAD;
  const maxChars = quota?.maxChars ?? 2000;
  const remaining = quota?.remaining;
  const overQuota = remaining !== undefined && remaining <= 0;

  useEffect(() => {
    void fetch("/api/ai/proofread")
      .then((res) => res.json())
      .then((data: Quota) => setQuota(data))
      .catch(() => undefined);
  }, []);

  async function handleSubmit(mode: ProofreadMode) {
    if (!text.trim() || overQuota) return;
    setBusy(true);
    setActiveMode(mode);
    setError(null);
    trackEvent({ name: "tool_start", tool: "ai-proofread" });

    try {
      const res = await fetch("/api/ai/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });
      const data = await res.json();
      if (typeof data.remaining === "number" && typeof data.limit === "number") {
        setQuota((prev) => ({
          limit: data.limit,
          remaining: data.remaining,
          hourlyLimit: prev?.hourlyLimit ?? 5,
          maxChars: prev?.maxChars ?? maxChars,
        }));
      }
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました。");
        return;
      }
      setResult(data as ProofreadResult);
      setTab("corrected");
      trackEvent({
        name: "tool_complete",
        tool: "ai-proofread",
        meta: {
          provider: (data as ProofreadResult).provider,
          mode,
        },
      });
    } catch {
      setError("通信に失敗しました。");
    } finally {
      setBusy(false);
      setActiveMode(null);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const value =
      tab === "corrected"
        ? result.corrected
        : tab === "business"
          ? result.business
          : tab === "keigo"
            ? result.keigo
            : result.issues.map((i) => `${i.original} → ${i.suggestion}`).join("\n");
    await navigator.clipboard.writeText(value);
    setCopied(true);
    trackEvent({ name: "copy_click", tool: "ai-proofread" });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-muted)]">
        <span>
          無料枠: 1日 {quota?.limit ?? 10} 回 / 1時間 {quota?.hourlyLimit ?? 5}{" "}
          回まで（広告で運営）
        </span>
        <span className="font-medium text-[var(--color-text)]">
          残り {remaining ?? "—"} 回
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxChars))}
        placeholder={`日本語の文章を入力してください（最大${maxChars}文字）`}
        rows={10}
        className="w-full resize-y rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
      />
      <p className="text-xs text-[var(--color-muted)]">
        {text.length.toLocaleString("ja-JP")} / {maxChars.toLocaleString("ja-JP")} 文字
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit("proofread")}
          disabled={busy || !text.trim() || overQuota}
          className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && activeMode === "proofread" ? "校正中…" : "AIで校正する"}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit("translate-en")}
          disabled={busy || !text.trim() || overQuota}
          className="rounded-[var(--radius)] border border-[var(--color-accent)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && activeMode === "translate-en" ? "翻訳中…" : "英語にする"}
        </button>
        <p className="text-xs text-[var(--color-muted)]">
          Gemini 無料枠を利用（有料APIへの自動フォールバックは無効）
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.isDemo && (
            <p className="rounded-[var(--radius)] bg-amber-50 px-3 py-2 text-xs text-amber-800">
              デモモードです。APIキー未設定時の簡易応答です。
            </p>
          )}
          {!result.isDemo && (
            <p className="text-xs text-[var(--color-muted)]">
              provider: {result.provider}
              {result.mode === "translate-en" ? " / 日本語→英語" : " / 日本語校正"}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  tab === item.id
                    ? "bg-[var(--color-accent)] text-white"
                    : "border border-[var(--color-border)] bg-white text-[var(--color-muted)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "issues" ? (
            <ul className="space-y-3">
              {result.issues.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">
                  {resultMode === "translate-en"
                    ? "特記事項はありません。"
                    : "指摘はありませんでした。"}
                </li>
              ) : (
                result.issues.map((issue, idx) => (
                  <li
                    key={`${issue.original}-${idx}`}
                    className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm"
                  >
                    <p className="font-medium">
                      {issue.original} → {issue.suggestion}
                    </p>
                    <p className="mt-1 text-[var(--color-muted)]">{issue.explanation}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-accent)]">
                      {issue.type}
                    </p>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <pre className="whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--color-bg)] p-4 text-sm leading-relaxed">
              {tab === "corrected"
                ? result.corrected
                : tab === "business"
                  ? result.business
                  : result.keigo}
            </pre>
          )}

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium"
          >
            {copied ? "コピーしました" : "結果をコピー"}
          </button>
        </div>
      )}
    </div>
  );
}
