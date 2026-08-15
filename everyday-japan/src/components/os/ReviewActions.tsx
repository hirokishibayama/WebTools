"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ReviewActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "approve" | "reject" | "needs_rewrite") {
    setMessage(null);
    const res = await fetch("/api/os/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, action, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed");
      return;
    }
    setMessage(`Marked ${action}`);
    startTransition(() => {
      router.push("/os");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300/80 bg-white/70 p-4">
      <label className="block text-sm text-[var(--muted)]">
        Note (optional)
        <textarea
          className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-[var(--ink)]"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => act("approve")}
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => act("needs_rewrite")}
          className="rounded-md bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Needs Rewrite
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => act("reject")}
          className="rounded-md bg-rose-700 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
