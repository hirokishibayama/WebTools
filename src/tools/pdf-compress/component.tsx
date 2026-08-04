"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { formatBytes, formatPercent } from "@/lib/utils/format";
import { trackEvent } from "@/lib/analytics/events";

type Result = {
  originalName: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
};

async function compressPdf(file: File): Promise<Result> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((page) => out.addPage(page));

  // Re-save with object streams for modest size reduction (browser-only).
  const compressed = await out.save({ useObjectStreams: true });
  const blob = new Blob([new Uint8Array(compressed)], { type: "application/pdf" });

  return {
    originalName: file.name,
    originalSize: file.size,
    compressedSize: blob.size,
    blob,
  };
}

export default function PdfCompressTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("PDFファイルを選択してください。");
      return;
    }

    setError(null);
    setBusy(true);
    setResult(null);
    trackEvent({ name: "tool_start", tool: "pdf-compress" });

    try {
      const next = await compressPdf(file);
      setResult(next);
      trackEvent({
        name: "tool_complete",
        tool: "pdf-compress",
        meta: {
          originalSize: next.originalSize,
          compressedSize: next.compressedSize,
        },
      });
    } catch {
      setError("PDFの処理に失敗しました。暗号化されていないPDFをお試しください。");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.originalName.replace(/\.pdf$/i, "") + "-compressed.pdf";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent({ name: "download_click", tool: "pdf-compress" });
  }

  const reduction =
    result && result.originalSize > 0
      ? 1 - result.compressedSize / result.originalSize
      : 0;

  return (
    <div className="space-y-5">
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-12 text-center transition hover:border-[var(--color-accent)]"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        <p className="font-medium">PDFをドラッグ＆ドロップ、またはクリックして選択</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          ファイルはブラウザ内でのみ処理され、サーバーへは送信されません
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {busy && <p className="text-sm text-[var(--color-muted)]">圧縮処理中…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-4 rounded-[var(--radius)] bg-[var(--color-bg)] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--color-muted)]">元サイズ</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatBytes(result.originalSize)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">圧縮後</p>
              <p className="text-lg font-semibold tabular-nums text-[var(--color-accent)]">
                {formatBytes(result.compressedSize)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">削減率</p>
              <p className="text-lg font-semibold tabular-nums text-[var(--color-success)]">
                {reduction > 0 ? formatPercent(reduction) : "0%（変化なし）"}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            ※ ブラウザ内再保存による圧縮です。画像が多いPDFでは削減幅が小さい場合があります。
          </p>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            圧縮PDFをダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
