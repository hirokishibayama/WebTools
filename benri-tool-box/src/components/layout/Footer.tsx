import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[var(--max-width)] flex-col gap-3 px-4 py-8 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/tools" className="hover:text-[var(--color-text)]">
            ツール一覧
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-text)]">
            プライバシー
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-text)]">
            利用規約
          </Link>
        </div>
      </div>
    </footer>
  );
}
