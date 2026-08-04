import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: `${SITE_NAME}のプライバシーポリシーです。`,
};

export default function PrivacyPage() {
  return (
    <Container className="prose-like space-y-6 py-10 text-sm leading-relaxed text-[var(--color-text)]">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
      <p className="text-[var(--color-muted)]">最終更新日: 2026-08-04</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. はじめに</h2>
        <p>
          {SITE_NAME}（{SITE_URL}
          ）は、本ポリシーに従ってユーザーの情報を取り扱います。本サービスは主にブラウザ内で動作する無料ツールを提供します。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. 収集する情報</h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>アクセス解析（ページ閲覧、ツール利用開始・完了など）</li>
          <li>広告配信に必要なCookie・端末情報（Google AdSense等）</li>
          <li>AI文章校正利用時に入力された文章（処理のためAIプロバイダへ送信）</li>
        </ul>
        <p className="text-[var(--color-muted)]">
          文字数カウント、全角半角変換、PDF/画像圧縮など多くのツールはブラウザ内で完結し、入力内容をサーバーに保存しません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. 広告について</h2>
        <p className="text-[var(--color-muted)]">
          当サイトでは第三者配信の広告サービス（Google AdSense等）を利用する場合があります。広告配信事業者はCookie等を使用して、ユーザーの興味に応じた広告を表示することがあります。詳細は各事業者のポリシーをご確認ください。
        </p>
        <p>
          <a
            className="text-[var(--color-accent)] underline"
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Googleの広告に関するポリシー
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. アクセス解析</h2>
        <p className="text-[var(--color-muted)]">
          Google Analytics等を利用し、サイト改善のために利用状況を分析します。個人を特定しない形で集計します。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. お問い合わせ</h2>
        <p className="text-[var(--color-muted)]">
          本ポリシーに関するお問い合わせは、サイト運営者までご連絡ください。
        </p>
      </section>
    </Container>
  );
}
