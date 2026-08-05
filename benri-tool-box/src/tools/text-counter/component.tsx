"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/events";

type Counts = {
  chars: number;
  charsNoSpace: number;
  lines: number;
  paragraphs: number;
};

function countText(text: string): Counts {
  const chars = [...text].length;
  const charsNoSpace = [...text.replace(/\s/g, "")].length;
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  const paragraphs =
    text.trim().length === 0
      ? 0
      : text
          .trim()
          .split(/\n\s*\n/)
          .filter((p) => p.trim().length > 0).length;

  return { chars, charsNoSpace, lines, paragraphs };
}

export default function TextCounterTool() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const started = useRef(false);
  const counts = countText(text);

  useEffect(() => {
    if (text.length > 0 && !started.current) {
      started.current = true;
      trackEvent({ name: "tool_start", tool: "text-counter" });
    }
  }, [text]);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    trackEvent({ name: "copy_click", tool: "text-counter" });
    trackEvent({
      name: "tool_complete",
      tool: "text-counter",
      meta: { chars: counts.chars },
    });
    setTimeout(() => setCopied(false), 1500);
  }

  const stats: { label: string; value: number }[] = [
    { label: "文字数", value: counts.chars },
    { label: "空白除外", value: counts.charsNoSpace },
    { label: "行数", value: counts.lines },
    { label: "段落数", value: counts.paragraphs },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius)] bg-[var(--color-bg)] px-4 py-3 text-center"
          >
            <p className="text-2xl font-semibold tabular-nums text-[var(--color-accent)]">
              {stat.value.toLocaleString("ja-JP")}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ここにテキストを入力または貼り付けてください"
        rows={12}
        className="w-full resize-y rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text}
          className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "コピーしました" : "テキストをコピー"}
        </button>
        <button
          type="button"
          onClick={() => setText("")}
          disabled={!text}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          クリア
        </button>
      </div>
    </div>
  );
}
