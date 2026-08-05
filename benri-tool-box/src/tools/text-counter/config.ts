import type { ToolDefinition } from "@/tools/types";

export const textCounterConfig: Omit<ToolDefinition, "loadComponent"> = {
  slug: "text-counter",
  name: "文字数カウンター",
  description:
    "文字数・空白除外文字数・行数・段落数をリアルタイムでカウント。ブログ・SNS・原稿作成に。",
  category: "text",
  keywords: ["文字数", "カウント", "行数", "段落", "文字数カウント"],
  seo: {
    title: "文字数カウント｜無料で文字数・行数を確認",
    description:
      "無料の文字数カウンター。文字数・空白除外・行数・段落数をリアルタイム表示。ブログ・SNS・原稿作成に最適。",
    h1: "文字数カウンター",
  },
  howTo: [
    {
      title: "テキストを入力",
      description: "テキストエリアに文章を入力するか、クリップボードから貼り付けます。",
    },
    {
      title: "結果を確認",
      description: "上部に文字数・空白除外・行数・段落数がリアルタイム表示されます。",
    },
    {
      title: "必要ならコピー",
      description: "「テキストをコピー」で入力内容をそのままコピーできます。",
    },
  ],
  faqs: [
    {
      question: "空白や改行は文字数に含まれますか？",
      answer:
        "「文字数」には空白・改行も含みます。「空白除外」ではスペース・タブ・改行を除いた文字数を表示します。",
    },
    {
      question: "絵文字や全角文字はどうカウントされますか？",
      answer:
        "Unicodeコードポイント単位でカウントします。多くの絵文字は1文字として扱われます。",
    },
    {
      question: "データはサーバーに送信されますか？",
      answer: "いいえ。すべてブラウザ内で処理され、入力内容は外部に送信されません。",
    },
  ],
  relatedSlugs: ["zenkaku-hankaku", "ai-proofread"],
  status: "published",
  isPopular: true,
  isNew: false,
  publishedAt: "2026-08-04",
  tier: "free",
  limits: { adsEnabled: true },
};
