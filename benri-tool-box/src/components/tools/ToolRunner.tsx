"use client";

import { lazy, Suspense, useMemo } from "react";
import { getToolBySlug } from "@/tools/registry";

type ToolRunnerProps = {
  slug: string;
};

export function ToolRunner({ slug }: ToolRunnerProps) {
  const tool = getToolBySlug(slug);

  const ToolComponent = useMemo(() => {
    if (!tool) return null;
    return lazy(tool.loadComponent);
  }, [tool]);

  if (!tool || !ToolComponent) {
    return <p className="text-sm text-red-600">ツールが見つかりません。</p>;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center text-sm text-[var(--color-muted)]">
          ツールを読み込み中...
        </div>
      }
    >
      <ToolComponent />
    </Suspense>
  );
}
