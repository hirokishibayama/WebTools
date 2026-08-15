import { NextResponse } from "next/server";
import { reviewAction, runWorkerLoop } from "../../../../../os/worker/runner";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      jobId?: string;
      action?: "approve" | "reject" | "needs_rewrite";
      note?: string;
    };
    if (!body.jobId || !body.action) {
      return NextResponse.json({ error: "jobId and action required" }, { status: 400 });
    }
    const job = reviewAction(body.jobId, body.action, body.note);
    if (body.action === "approve" || body.action === "needs_rewrite") {
      await runWorkerLoop({ maxJobs: 10 });
    }
    return NextResponse.json({ ok: true, job });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
