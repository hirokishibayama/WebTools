import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "利用規約",
  description: `${SITE_NAME}の利用規約です。`,
};

export default function TermsPage() {
  return (
    <Container className="space-y-6 py-10 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">利用規約</h1>
      <p className="text-[var(--color-muted)]">最終更新日: 2026-08-04</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. サービス内容</h2>
        <p className="text-[var(--color-muted)]">
          {SITE_NAME}
          は、無料のオンライン便利ツールを提供します。予告なく内容の変更・停止を行う場合があります。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. 免責</h2>
        <p className="text-[var(--color-muted)]">
          ツールの出力結果の正確性・完全性は保証しません。業務利用時は必ずご自身で内容を確認してください。AI校正・翻訳の結果についても同様です。当サービスの利用により生じた損害について、運営者は責任を負いません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. 禁止事項</h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>法令または公序良俗に反する利用</li>
          <li>過度な負荷をかける行為、不正アクセス</li>
          <li>広告の不正クリック、収益妨害</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. 知的財産</h2>
        <p className="text-[var(--color-muted)]">
          本サイトのコンテンツに関する権利は運営者に帰属します。ユーザーが入力したデータはユーザーに帰属します。
        </p>
      </section>
    </Container>
  );
}
