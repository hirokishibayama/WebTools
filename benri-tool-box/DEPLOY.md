# 収益化デプロイ手順（Vercel + AdSense）

## 1. Vercel にデプロイ

```bash
# 初回のみ
git init
git add .
git commit -m "Initial commit: 便利ツール箱 MVP"

# GitHub にリポジトリ作成して push（推奨）
# その後 https://vercel.com/new で Import

# または CLI
npx vercel
```

### Vercel 環境変数（Production）

| 変数 | 必須 | 説明 |
|------|------|------|
| `NEXT_PUBLIC_SITE_URL` | 推奨 | 本番URL（sitemap用） |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | 広告 | `ca-pub-...` |
| `NEXT_PUBLIC_ADSENSE_SLOT_TOP` | 任意 | 上部広告ユニットID |
| `NEXT_PUBLIC_ADSENSE_SLOT_IN_CONTENT` | 任意 | 中段広告ユニットID |
| `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM` | 任意 | 下部広告ユニットID |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 推奨 | GA4 |
| `GEMINI_API_KEY` | AI用 | Gemini（無料枠想定） |
| `OPENAI_API_KEY` | 任意 | `AI_OPENAI_FALLBACK=true` のときのみ |
| `AI_OPENAI_FALLBACK` | 推奨 false | 有料フォールバック禁止（赤字防止） |
| `AI_DAILY_LIMIT_PER_IP` | 推奨 | 既定 10 |
| `AI_HOURLY_LIMIT_PER_IP` | 推奨 | 既定 5 |
| `AI_MAX_CHARS` | 推奨 | 既定 2000 |
| `AI_ENABLED` | 任意 | `false` で緊急停止 |

環境変数変更後は Redeploy が必要です。

---

## 2. Google AdSense で稼ぐ流れ

1. [AdSense](https://www.google.com/adsense/) に登録（本人確認・支払い先）
2. 本番ドメインをサイト追加
3. 審査通過まで待つ（数日〜数週間。コンテンツ不足だと却下されやすい）
4. 通過後:
   - **自動広告**をON（最短で表示開始）
   - または広告ユニットを作り SLOT ID を環境変数へ
5. `https://あなたのドメイン/ads.txt` が正しく配信されているか確認

### 審査で見られるポイント（このサイトで用意済み）

- プライバシーポリシー `/privacy`
- 利用規約 `/terms`
- 実ツール・使い方・FAQ（薄いページNG対策）
- `ads.txt`

### 却下されやすい例

- 中身がほぼ空 / コピーコンテンツ
- プライバシーポリシーなし
- ドメイン取得直後でアクセスゼロ（対策: まずはインデックスさせる）

---

## 3. アクセスを集める（広告収益の本丸）

広告単価より **検索流入** が効きます。

- Google Search Console に登録
- 各ツールの SEO タイトルを継続改善
- ツールを増やしてロングテール獲得（Framework に1ツール追加するだけ）

---

## 4. 後から有料化する場合

ToolConfig の `tier` / `limits` / `features` を使う想定です。

- 広告非表示
- AI回数増加
- 一括処理

会員基盤は後付けで足せます。
