export type ProofreadMode = "proofread" | "translate-en";

export type ProofreadRequest = {
  text: string;
  mode?: ProofreadMode;
};

export type ProofreadIssue = {
  type: "typo" | "style" | "business" | "keigo";
  original: string;
  suggestion: string;
  explanation: string;
};

export type ProofreadResult = {
  corrected: string;
  business: string;
  keigo: string;
  issues: ProofreadIssue[];
  provider: string;
  isDemo: boolean;
  mode?: ProofreadMode;
};

export interface AiProvider {
  readonly id: string;
  proofread(request: ProofreadRequest): Promise<ProofreadResult>;
}

function getSystemPrompt(mode: ProofreadMode): string {
  if (mode === "translate-en") {
    return `あなたはプロの日英翻訳者です。入力された日本語を自然な英語に翻訳してください。次のJSONだけを返してください（余分な文字禁止）:
{
  "corrected": "自然で読みやすい英語訳",
  "business": "ビジネスメール向けの英語訳",
  "keigo": "丁寧・フォーマルな英語訳",
  "issues": [
    { "type": "style", "original": "原文の該当箇所", "suggestion": "英語での訳し分けメモ", "explanation": "翻訳上の注意（日本語で）" }
  ]
}
issues は重要な訳し分けや注意点があれば記入し、なければ空配列にしてください。`;
  }

  return `あなたは日本語のプロ校正者です。入力文章について次のJSONだけを返してください（余分な文字禁止）:
{
  "corrected": "誤字脱字・自然さを直した文章",
  "business": "ビジネスメール向けに整えた文章",
  "keigo": "丁寧な敬語に整えた文章",
  "issues": [
    { "type": "typo|style|business|keigo", "original": "...", "suggestion": "...", "explanation": "..." }
  ]
}`;
}

function parseProofreadJson(
  content: string,
  fallbackText: string,
  provider: string,
  mode: ProofreadMode,
): ProofreadResult {
  const jsonText = extractJsonObject(content);
  const parsed = JSON.parse(jsonText) as Omit<
    ProofreadResult,
    "provider" | "isDemo" | "mode"
  >;
  return {
    corrected: parsed.corrected ?? fallbackText,
    business: parsed.business ?? parsed.corrected ?? fallbackText,
    keigo: parsed.keigo ?? parsed.corrected ?? fallbackText,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    provider,
    isDemo: false,
    mode,
  };
}

function extractJsonObject(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error("Response did not contain JSON");
}

function demoProofread(
  text: string,
  mode: ProofreadMode = "proofread",
): ProofreadResult {
  if (mode === "translate-en") {
    return {
      corrected: `[Demo English] ${text}`,
      business: `Hi,\n\n[Demo business English]\n${text}\n\nBest regards`,
      keigo: `Dear Sir or Madam,\n\n[Demo formal English]\n${text}\n\nYours sincerely`,
      issues: [
        {
          type: "style",
          original: text.slice(0, 20) + (text.length > 20 ? "…" : ""),
          suggestion: "[Demo English]",
          explanation: "デモモードのため実翻訳ではありません。APIキー設定後に再実行してください。",
        },
      ],
      provider: "demo",
      isDemo: true,
      mode,
    };
  }

  const corrected = text
    .replaceAll("出来る", "できる")
    .replaceAll("下さい", "ください")
    .replaceAll("御座います", "ございます")
    .replaceAll("致します", "いたします");

  const issues: ProofreadIssue[] = [];
  if (text.includes("出来る")) {
    issues.push({
      type: "typo",
      original: "出来る",
      suggestion: "できる",
      explanation: "一般的にはひらがな表記が自然です。",
    });
  }
  if (text.includes("下さい")) {
    issues.push({
      type: "style",
      original: "下さい",
      suggestion: "ください",
      explanation: "補助動詞の「ください」はひらがなが推奨されます。",
    });
  }

  if (issues.length === 0 && text.trim()) {
    issues.push({
      type: "style",
      original: text.slice(0, 20) + (text.length > 20 ? "…" : ""),
      suggestion: corrected,
      explanation: "デモモードのため、簡易ルールで校正しています。",
    });
  }

  return {
    corrected,
    business: `お世話になっております。\n\n${corrected}\n\n何卒よろしくお願いいたします。`,
    keigo: corrected
      .replaceAll("します", "いたします")
      .replaceAll("です", "でございます")
      .replaceAll("ありがとう", "ありがとうございます"),
    issues,
    provider: "demo",
    isDemo: true,
    mode,
  };
}

export class DemoAiProvider implements AiProvider {
  readonly id = "demo";

  async proofread(request: ProofreadRequest): Promise<ProofreadResult> {
    return demoProofread(request.text, request.mode ?? "proofread");
  }
}

/** Free-tier friendly models for new API keys (2.5 is blocked for new users). */
const GEMINI_MODEL_CANDIDATES = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-flash-latest",
] as const;

export class GeminiAiProvider implements AiProvider {
  readonly id = "gemini";

  constructor(private readonly apiKey: string) {}

  async proofread(request: ProofreadRequest): Promise<ProofreadResult> {
    const preferred = process.env.GEMINI_MODEL?.trim();
    const models = preferred
      ? [preferred, ...GEMINI_MODEL_CANDIDATES.filter((m) => m !== preferred)]
      : [...GEMINI_MODEL_CANDIDATES];

    let lastError: unknown;
    for (const model of models) {
      try {
        return await this.proofreadWithModel(request, model);
      } catch (error) {
        lastError = error;
        console.warn(`[ai] Gemini model ${model} failed:`, error);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("All Gemini models failed");
  }

  private async proofreadWithModel(
    request: ProofreadRequest,
    model: string,
  ): Promise<ProofreadResult> {
    const mode = request.mode ?? "proofread";
    const system = getSystemPrompt(mode);
    const label = mode === "translate-en" ? "翻訳対象（日本語）" : "校正対象";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${system}\n\n---\n${label}:\n${request.text}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini API error (${model}): ${res.status} ${body}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!content) throw new Error(`Empty Gemini response (${model})`);

    return parseProofreadJson(content, request.text, this.id, mode);
  }
}

export class OpenAiProvider implements AiProvider {
  readonly id = "openai";

  constructor(private readonly apiKey: string) {}

  async proofread(request: ProofreadRequest): Promise<ProofreadResult> {
    const mode = request.mode ?? "proofread";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: getSystemPrompt(mode) },
          { role: "user", content: request.text },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${body}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty OpenAI response");

    return parseProofreadJson(content, request.text, this.id, mode);
  }
}

/**
 * Prefer Gemini. OpenAI fallback is OFF by default (cost control).
 * Set AI_OPENAI_FALLBACK=true to enable paid OpenAI fallback.
 * Demo is returned only when no live provider succeeds / is configured.
 */
export async function proofreadWithFallback(
  request: ProofreadRequest,
): Promise<ProofreadResult> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiFallback =
    process.env.AI_OPENAI_FALLBACK === "true" ||
    process.env.AI_OPENAI_FALLBACK === "1";

  if (geminiKey) {
    try {
      return await new GeminiAiProvider(geminiKey).proofread(request);
    } catch (error) {
      console.warn("[ai] Gemini failed:", error);
      if (!openaiFallback) {
        throw error;
      }
      console.warn("[ai] Falling back to OpenAI (AI_OPENAI_FALLBACK enabled)");
    }
  }

  if (openaiKey && (openaiFallback || !geminiKey)) {
    // Use OpenAI only when explicitly enabled as fallback, or as sole provider.
    if (!geminiKey || openaiFallback) {
      try {
        return await new OpenAiProvider(openaiKey).proofread(request);
      } catch (error) {
        console.warn("[ai] OpenAI failed:", error);
        throw error;
      }
    }
  }

  // No paid provider available — demo only (no API cost).
  if (!geminiKey && !openaiKey) {
    return new DemoAiProvider().proofread(request);
  }

  // Provider configured but failed — do not silently demo in production traffic
  // when keys exist; surface error to caller.
  throw new Error("AI provider unavailable");
}

/** @deprecated Prefer proofreadWithFallback for Gemini → OpenAI chain */
export function createAiProvider(): AiProvider {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) return new GeminiAiProvider(geminiKey);
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) return new OpenAiProvider(openaiKey);
  return new DemoAiProvider();
}

export function getConfiguredAiProviders(): string[] {
  const list: string[] = [];
  if (process.env.GEMINI_API_KEY?.trim()) list.push("gemini");
  if (process.env.OPENAI_API_KEY?.trim()) list.push("openai");
  return list;
}
