# 便利ツール箱

日本向けの無料オンライン便利ツールポータル（MVP）。

## 開発

```bash
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:3000 で起動します。

## ツールの追加方法

1. `src/tools/<slug>/config.ts` と `component.tsx` を作成
2. `src/tools/registry.ts` に1エントリ追加

ルーティング・SEO・広告枠・解析は共通 Framework が自動で扱います。ページファイルの追加は不要です。

## 環境変数

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SITE_URL` | サイトURL（sitemap用） |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense クライアントID（`ca-pub-...`） |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | 広告ユニットID（top / in-content / bottom） |
| `GEMINI_API_KEY` | AI文章校正（優先。未設定/失敗時は OpenAI） |
| `GEMINI_MODEL` | Gemini モデル（既定: gemini-3.5-flash-lite。失敗時は別モデルへ自動切替） |
| `OPENAI_API_KEY` | AI文章校正のフォールバック |
| `OPENAI_MODEL` | OpenAI モデル（既定: gpt-4o-mini） |

## デプロイ・収益化

詳細は [DEPLOY.md](./DEPLOY.md) を参照。
