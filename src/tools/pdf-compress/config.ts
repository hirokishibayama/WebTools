import type { ToolDefinition } from "@/tools/types";

export const pdfCompressConfig: Omit<ToolDefinition, "loadComponent"> = {
  slug: "pdf-compress",
  name: "PDF圧縮",
  description:
    "PDFをブラウザ内で圧縮。サーバーにアップロードせず、容量を削減してダウンロードできます。",
  category: "file",
  keywords: ["PDF", "圧縮", "容量削減", "PDF圧縮"],
  seo: {
    title: "PDF圧縮｜ブラウザで無料・アップロード不要",
    description:
      "PDFをブラウザ内で圧縮する無料ツール。ファイルはサーバーに送信されません。元サイズ・圧縮後サイズ・削減率を表示。",
    h1: "PDF圧縮ツール",
  },
  howTo: [
    {
      title: "PDFを選択",
      description: "ドラッグ＆ドロップ、またはクリックしてPDFファイルを選びます。",
    },
    {
      title: "自動で圧縮",
      description: "ブラウザ内で再保存処理を行い、容量を削減します。",
    },
    {
      title: "ダウンロード",
      description: "圧縮結果を確認し、必要ならダウンロードします。",
    },
  ],
  faqs: [
    {
      question: "ファイルはアップロードされますか？",
      answer: "いいえ。すべてお使いのブラウザ内で処理されます。",
    },
    {
      question: "どれくらい小さくなりますか？",
      answer:
        "PDFの構成によります。テキスト中心のPDFではオブジェクト最適化の効果があり、高解像度画像が多い場合は削減幅が小さいことがあります。",
    },
  ],
  relatedSlugs: ["image-compress"],
  status: "published",
  isNew: true,
  isPopular: true,
  publishedAt: "2026-08-04",
  tier: "free",
  limits: { maxFileBytes: 50 * 1024 * 1024, adsEnabled: true },
};
