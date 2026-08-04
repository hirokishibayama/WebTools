import type { ToolDefinition } from "@/tools/types";

export const imageCompressConfig: Omit<ToolDefinition, "loadComponent"> = {
  slug: "image-compress",
  name: "画像圧縮",
  description:
    "PNG / JPEG / WebP をブラウザ内で圧縮。元サイズ・圧縮後サイズ・削減率を確認してダウンロード。",
  category: "image",
  keywords: ["画像圧縮", "PNG", "JPEG", "WebP", "容量削減"],
  seo: {
    title: "画像圧縮｜PNG・JPEG・WebPを無料で軽量化",
    description:
      "画像をブラウザ内で圧縮する無料ツール。PNG / JPEG / WebP対応。アップロード不要で、削減率を確認できます。",
    h1: "画像圧縮ツール",
  },
  howTo: [
    {
      title: "品質を調整",
      description: "スライダーで圧縮品質を選びます（低いほど小さくなります）。",
    },
    {
      title: "画像を選択",
      description: "PNG / JPEG / WebP ファイルをドラッグ＆ドロップします。",
    },
    {
      title: "結果をダウンロード",
      description: "元サイズ・圧縮後・削減率を確認し、ダウンロードします。",
    },
  ],
  faqs: [
    {
      question: "対応形式は？",
      answer: "PNG、JPEG、WebP に対応しています。",
    },
    {
      question: "画像はサーバーに送られますか？",
      answer: "いいえ。圧縮はブラウザ内で完結します。",
    },
  ],
  relatedSlugs: ["pdf-compress"],
  status: "published",
  isNew: true,
  isPopular: true,
  publishedAt: "2026-08-04",
  tier: "free",
  limits: { maxFileBytes: 20 * 1024 * 1024, adsEnabled: true },
};
