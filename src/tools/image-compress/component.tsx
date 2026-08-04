"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { formatBytes, formatPercent } from "@/lib/utils/format";
import { trackEvent } from "@/lib/analytics/events";

type Result = {
  originalName: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  previewUrl: string;
};

const ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export default function ImageCompressTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [quality, setQuality] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const ok = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
    if (!ok) {
      setError("PNG / JPEG / WebP の画像を選択してください。");
      return;
    }

    setError(null);
    setBusy(true);
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
    trackEvent({ name: "tool_start", tool: "image-compress" });

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: Math.max(0.1, (file.size / (1024 * 1024)) * quality),
        maxWidthOrHeight: 2560,
        useWebWorker: true,
        initialQuality: quality,
        fileType: file.type === "image/png" ? "image/png" : file.type,
      });

      const blob = compressed;
      const next: Result = {
        originalName: file.name,
        originalSize: file.size,
        compressedSize: blob.size,
        blob,
        previewUrl: URL.createObjectURL(blob),
      };
      setResult(next);
      trackEvent({
        name: "tool_complete",
        tool: "image-compress",
        meta: {
          originalSize: next.originalSize,
          compressedSize: next.compressedSize,
        },
      });
    } catch {
      setError("画像の圧縮に失敗しました。別のファイルをお試しください。");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const ext =
      result.blob.type === "image/webp"
        ? "webp"
        : result.blob.type === "image/png"
          ? "png"
          : "jpg";
    const base = result.originalName.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = result.previewUrl;
    a.download = `${base}-compressed.${ext}`;
    a.click();
    trackEvent({ name: "download_click", tool: "image-compress" });
  }

  const reduction =
    result && result.originalSize > 0
      ? 1 - result.compressedSize / result.originalSize
      : 0;

  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium">
          品質: {Math.round(quality * 100)}%
        </span>
        <input
          type="range"
          min={0.3}
          max={0.95}
          step={0.05}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      </label>

      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-12 text-center transition hover:border-[var(--color-accent)]"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        <p className="font-medium">画像をドラッグ＆ドロップ、またはクリックして選択</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">対応形式: PNG / JPEG / WebP</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
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
                {reduction > 0 ? formatPercent(reduction) : "0%"}
              </p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.previewUrl}
            alt="圧縮プレビュー"
            className="max-h-64 rounded-[var(--radius)] border border-[var(--color-border)] object-contain"
          />
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            圧縮画像をダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
