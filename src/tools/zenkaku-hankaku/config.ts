import type { ToolDefinition } from "@/tools/types";

export const zenkakuHankakuConfig: Omit<ToolDefinition, "loadComponent"> = {
  slug: "zenkaku-hankaku",
  name: "全角半角変換",
  description:
    "全角⇔半角、英数字のみ、カタカナの相互変換。データ入力や表記ゆれの統一に便利。",
  category: "convert",
  keywords: ["全角", "半角", "変換", "カタカナ", "英数字"],
  seo: {
    title: "全角半角変換｜英数字・カタカナを無料で変換",
    description:
      "全角⇔半角、英数字のみ、カタカナ変換に対応した無料ツール。ブラウザ内で完結し、データは送信しません。",
    h1: "全角半角変換ツール",
  },
  howTo: [
    {
      title: "変換モードを選ぶ",
      description: "全角→半角、半角→全角、英数字のみ、カタカナ変換から選択します。",
    },
    {
      title: "文字列を入力",
      description: "左側の入力欄に変換したい文字列を貼り付けます。",
    },
    {
      title: "結果をコピー",
      description: "右側に変換結果が表示されます。「結果をコピー」で利用できます。",
    },
  ],
  faqs: [
    {
      question: "どの文字が変換されますか？",
      answer:
        "英数字・一部記号・カタカナ（濁点・半濁点含む）・全角/半角スペースに対応しています。漢字やひらがなはそのまま残ります。",
    },
    {
      question: "サーバーに送信されますか？",
      answer: "いいえ。変換はすべてブラウザ内で行われます。",
    },
  ],
  relatedSlugs: ["text-counter", "ai-proofread"],
  status: "published",
  isPopular: true,
  publishedAt: "2026-08-04",
  tier: "free",
  limits: { adsEnabled: true },
};
