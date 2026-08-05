import type { ToolDefinition } from "@/tools/types";

export const aiProofreadConfig: Omit<ToolDefinition, "loadComponent"> = {
  slug: "ai-proofread",
  name: "AI文章校正",
  description:
    "誤字チェック、自然な文章への修正、ビジネス向け表現、敬語チェックをAIがサポート。",
  category: "ai",
  keywords: ["文章校正", "誤字", "敬語", "ビジネスメール", "AI"],
  seo: {
    title: "AI文章校正｜誤字・敬語・ビジネス表現をチェック",
    description:
      "無料のAI文章校正ツール。誤字脱字、自然な修正、ビジネス向け表現、敬語チェックに対応。",
    h1: "AI文章校正ツール",
  },
  howTo: [
    {
      title: "文章を入力",
      description: "校正したい日本語の文章をテキストエリアに貼り付けます。",
    },
    {
      title: "AIで校正",
      description: "「AIで校正する」を押すと、誤字・表現・敬語の観点で分析します。",
    },
    {
      title: "結果を確認・コピー",
      description: "タブで修正案を切り替え、必要な文章をコピーして使います。",
    },
  ],
  faqs: [
    {
      question: "何回まで使えますか？",
      answer:
        "無料枠はIPあたり1日10回・1時間5回までです（環境変数で変更可）。広告収益で運営するための制限です。",
    },
    {
      question: "どのAIを使っていますか？",
      answer:
        "既定は Gemini です。コスト管理のため、OpenAI への自動フォールバックは無効です（明示設定時のみ有効）。",
    },
    {
      question: "入力文章は保存されますか？",
      answer:
        "当サービス側のデータベースには保存しません。APIキー設定時は校正処理のためAIプロバイダへ送信されます。",
    },
  ],
  relatedSlugs: ["text-counter", "zenkaku-hankaku"],
  status: "published",
  isNew: true,
  publishedAt: "2026-08-04",
  tier: "free",
  features: { aiModes: ["proofread", "translate-en", "business", "keigo"] },
  limits: { maxInputChars: 2000, dailyAiCalls: 10, adsEnabled: true },
};
