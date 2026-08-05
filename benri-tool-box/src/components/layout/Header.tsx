import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[var(--max-width)] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-[var(--color-text)]">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-6 text-sm text-[var(--color-muted)]">
          <Link href="/tools" className="transition-colors hover:text-[var(--color-text)]">
            ツール一覧
          </Link>
        </nav>
      </div>
    </header>
  );
}
