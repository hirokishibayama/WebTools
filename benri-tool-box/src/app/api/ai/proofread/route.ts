import { NextResponse } from "next/server";
import {
  proofreadWithFallback,
  type ProofreadMode,
  type ProofreadRequest,
} from "@/lib/ai/provider";
import {
  checkAiRateLimit,
  consumeAiRateLimit,
  getAiRateLimits,
  getClientIp,
} from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

const MAX_CHARS = Number(process.env.AI_MAX_CHARS ?? "2000");

function rateHeaders(remaining: number, limit: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
  };
}

/** Quota status for the UI (does not consume). */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const status = checkAiRateLimit(ip);
  const limits = getAiRateLimits();
  return NextResponse.json(
    {
      limit: status.limit,
      remaining: status.remaining,
      hourlyLimit: limits.hourly,
      maxChars: Number.isFinite(MAX_CHARS) && MAX_CHARS > 0 ? MAX_CHARS : 2000,
      openaiFallback: process.env.AI_OPENAI_FALLBACK === "true",
    },
    { headers: rateHeaders(status.remaining, status.limit) },
  );
}

export async function POST(request: Request) {
  try {
    if (process.env.AI_ENABLED === "false" || process.env.AI_ENABLED === "0") {
      return NextResponse.json(
        { error: "AI機能は現在メンテナンス中です。" },
        { status: 503 },
      );
    }

    const ip = getClientIp(request);
    const precheck = checkAiRateLimit(ip);
    if (!precheck.allowed) {
      return NextResponse.json(
        {
          error: precheck.reason,
          limit: precheck.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: rateHeaders(0, precheck.limit),
        },
      );
    }

    const body = (await request.json()) as ProofreadRequest;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const mode: ProofreadMode =
      body.mode === "translate-en" ? "translate-en" : "proofread";
    const maxChars = Number.isFinite(MAX_CHARS) && MAX_CHARS > 0 ? MAX_CHARS : 2000;

    if (!text) {
      return NextResponse.json({ error: "文章を入力してください。" }, { status: 400 });
    }
    if (text.length > maxChars) {
      return NextResponse.json(
        { error: `文字数は${maxChars}文字以内にしてください。` },
        { status: 400 },
      );
    }

    // Call AI first; only count successful paid/free API usage.
    const result = await proofreadWithFallback({ text, mode });
    const consumed = consumeAiRateLimit(ip);

    return NextResponse.json(
      {
        ...result,
        remaining: consumed.remaining,
        limit: consumed.limit,
      },
      { headers: rateHeaders(consumed.remaining, consumed.limit) },
    );
  } catch (error) {
    console.error("[ai/proofread]", error);
    return NextResponse.json(
      {
        error:
          "AI処理に失敗しました。無料枠の混雑や一時障害の可能性があります。しばらくしてから再度お試しください。",
      },
      { status: 500 },
    );
  }
}
