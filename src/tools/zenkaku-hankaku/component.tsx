"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/events";

type Mode =
  | "full-to-half"
  | "half-to-full"
  | "alnum-to-half"
  | "alnum-to-full"
  | "kana-to-half"
  | "kana-to-full";

const MODES: { id: Mode; label: string }[] = [
  { id: "full-to-half", label: "全角 → 半角" },
  { id: "half-to-full", label: "半角 → 全角" },
  { id: "alnum-to-half", label: "英数字のみ半角へ" },
  { id: "alnum-to-full", label: "英数字のみ全角へ" },
  { id: "kana-to-half", label: "カタカナ → 半角" },
  { id: "kana-to-full", label: "カタカナ → 全角" },
];

const FULL_ALNUM =
  "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ";
const HALF_ALNUM =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const FULL_SPACE = "　";
const HALF_SPACE = " ";

const FULL_SYMBOLS = "！”＃＄％＆’（）＊＋，－．／：；＜＝＞？＠［￥］＾＿｀｛｜｝〜";
const HALF_SYMBOLS = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const KANA_MAP: [string, string][] = [
  ["ガ", "ｶﾞ"],
  ["ギ", "ｷﾞ"],
  ["グ", "ｸﾞ"],
  ["ゲ", "ｹﾞ"],
  ["ゴ", "ｺﾞ"],
  ["ザ", "ｻﾞ"],
  ["ジ", "ｼﾞ"],
  ["ズ", "ｽﾞ"],
  ["ゼ", "ｾﾞ"],
  ["ゾ", "ｿﾞ"],
  ["ダ", "ﾀﾞ"],
  ["ヂ", "ﾁﾞ"],
  ["ヅ", "ﾂﾞ"],
  ["デ", "ﾃﾞ"],
  ["ド", "ﾄﾞ"],
  ["バ", "ﾊﾞ"],
  ["ビ", "ﾋﾞ"],
  ["ブ", "ﾌﾞ"],
  ["ベ", "ﾍﾞ"],
  ["ボ", "ﾎﾞ"],
  ["パ", "ﾊﾟ"],
  ["ピ", "ﾋﾟ"],
  ["プ", "ﾌﾟ"],
  ["ペ", "ﾍﾟ"],
  ["ポ", "ﾎﾟ"],
  ["ヴ", "ｳﾞ"],
  ["ア", "ｱ"],
  ["イ", "ｲ"],
  ["ウ", "ｳ"],
  ["エ", "ｴ"],
  ["オ", "ｵ"],
  ["カ", "ｶ"],
  ["キ", "ｷ"],
  ["ク", "ｸ"],
  ["ケ", "ｹ"],
  ["コ", "ｺ"],
  ["サ", "ｻ"],
  ["シ", "ｼ"],
  ["ス", "ｽ"],
  ["セ", "ｾ"],
  ["ソ", "ｿ"],
  ["タ", "ﾀ"],
  ["チ", "ﾁ"],
  ["ツ", "ﾂ"],
  ["テ", "ﾃ"],
  ["ト", "ﾄ"],
  ["ナ", "ﾅ"],
  ["ニ", "ﾆ"],
  ["ヌ", "ﾇ"],
  ["ネ", "ﾈ"],
  ["ノ", "ﾉ"],
  ["ハ", "ﾊ"],
  ["ヒ", "ﾋ"],
  ["フ", "ﾌ"],
  ["ヘ", "ﾍ"],
  ["ホ", "ﾎ"],
  ["マ", "ﾏ"],
  ["ミ", "ﾐ"],
  ["ム", "ﾑ"],
  ["メ", "ﾒ"],
  ["モ", "ﾓ"],
  ["ヤ", "ﾔ"],
  ["ユ", "ﾕ"],
  ["ヨ", "ﾖ"],
  ["ラ", "ﾗ"],
  ["リ", "ﾘ"],
  ["ル", "ﾙ"],
  ["レ", "ﾚ"],
  ["ロ", "ﾛ"],
  ["ワ", "ﾜ"],
  ["ヲ", "ｦ"],
  ["ン", "ﾝ"],
  ["ァ", "ｧ"],
  ["ィ", "ｨ"],
  ["ゥ", "ｩ"],
  ["ェ", "ｪ"],
  ["ォ", "ｫ"],
  ["ッ", "ｯ"],
  ["ャ", "ｬ"],
  ["ュ", "ｭ"],
  ["ョ", "ｮ"],
  ["ー", "ｰ"],
  ["。", "｡"],
  ["、", "､"],
  ["「", "｢"],
  ["」", "｣"],
  ["・", "･"],
];

function mapChars(text: string, from: string, to: string): string {
  return [...text]
    .map((ch) => {
      const idx = from.indexOf(ch);
      return idx >= 0 ? to[idx] : ch;
    })
    .join("");
}

function replacePairs(text: string, pairs: [string, string][], reverse = false): string {
  let result = text;
  for (const [full, half] of pairs) {
    const [from, to] = reverse ? [half, full] : [full, half];
    result = result.split(from).join(to);
  }
  return result;
}

function convert(text: string, mode: Mode): string {
  switch (mode) {
    case "full-to-half":
      return replacePairs(
        mapChars(
          mapChars(text.replaceAll(FULL_SPACE, HALF_SPACE), FULL_ALNUM, HALF_ALNUM),
          FULL_SYMBOLS,
          HALF_SYMBOLS,
        ),
        KANA_MAP,
      );
    case "half-to-full":
      return replacePairs(
        mapChars(
          mapChars(text.replaceAll(HALF_SPACE, FULL_SPACE), HALF_ALNUM, FULL_ALNUM),
          HALF_SYMBOLS,
          FULL_SYMBOLS,
        ),
        KANA_MAP,
        true,
      );
    case "alnum-to-half":
      return mapChars(text, FULL_ALNUM, HALF_ALNUM);
    case "alnum-to-full":
      return mapChars(text, HALF_ALNUM, FULL_ALNUM);
    case "kana-to-half":
      return replacePairs(text, KANA_MAP);
    case "kana-to-full":
      return replacePairs(text, KANA_MAP, true);
    default:
      return text;
  }
}

export default function ZenkakuHankakuTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("full-to-half");
  const [copied, setCopied] = useState(false);
  const started = useRef(false);
  const output = convert(input, mode);

  useEffect(() => {
    if (input.length > 0 && !started.current) {
      started.current = true;
      trackEvent({ name: "tool_start", tool: "zenkaku-hankaku" });
    }
  }, [input]);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    trackEvent({ name: "copy_click", tool: "zenkaku-hankaku" });
    trackEvent({ name: "tool_complete", tool: "zenkaku-hankaku", meta: { mode } });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              mode === item.id
                ? "bg-[var(--color-accent)] text-white"
                : "border border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium">入力</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="変換したい文字列を入力"
            rows={10}
            className="w-full resize-y rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">変換結果</span>
          <textarea
            value={output}
            readOnly
            rows={10}
            className="w-full resize-y rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!output}
          className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "コピーしました" : "結果をコピー"}
        </button>
        <button
          type="button"
          onClick={() => setInput("")}
          disabled={!input}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          クリア
        </button>
      </div>
    </div>
  );
}
