export type CrossLinkItem = {
  href: string;
  title: string;
  description?: string;
};

export const BENRI_TOOLBOX_URL =
  process.env.NEXT_PUBLIC_BENRI_TOOLBOX_URL ?? "https://webtools-two-swart.vercel.app";

/** Prefer English locale on Benri Toolbox for Everyday Japan readers. */
export const BENRI_LOCALE_PREFIX = `${BENRI_TOOLBOX_URL}/en`;

export const BENRI_HOME: CrossLinkItem = {
  href: BENRI_LOCALE_PREFIX,
  title: "Benri Toolbox",
  description: "Free online utility tools for text, files, images, and AI proofreading.",
};

export const BENRI_TOOLS_LIST: CrossLinkItem = {
  href: `${BENRI_LOCALE_PREFIX}/tools`,
  title: "All tools",
  description: "Browse free Japanese utility tools.",
};

export const FEATURED_BENRI_TOOLS: CrossLinkItem[] = [
  {
    href: `${BENRI_LOCALE_PREFIX}/tools/text-counter`,
    title: "Character Counter",
    description: "Count characters, lines, and paragraphs in real time.",
  },
  {
    href: `${BENRI_LOCALE_PREFIX}/tools/zenkaku-hankaku`,
    title: "Full/Half-width Converter",
    description: "Convert Japanese full-width and half-width characters.",
  },
  {
    href: `${BENRI_LOCALE_PREFIX}/tools/ai-proofread`,
    title: "AI Proofreading",
    description: "Polish Japanese text and translate to English.",
  },
  {
    href: `${BENRI_LOCALE_PREFIX}/tools/pdf-compress`,
    title: "PDF Compress",
    description: "Shrink PDFs in your browser—no upload.",
  },
  {
    href: `${BENRI_LOCALE_PREFIX}/tools/image-compress`,
    title: "Image Compress",
    description: "Compress PNG, JPEG, and WebP locally.",
  },
];

/** Article slug → related Benri tools (contextual SEO links). */
const ARTICLE_TO_TOOLS: Record<string, CrossLinkItem[]> = {
  "why-japanese-people-say-sumimasen-so-often": [
    FEATURED_BENRI_TOOLS[2],
    FEATURED_BENRI_TOOLS[0],
  ],
  "why-japanese-people-say-daijoubu-so-often": [
    FEATURED_BENRI_TOOLS[2],
    FEATURED_BENRI_TOOLS[0],
  ],
  "why-japanese-people-avoid-saying-no-directly": [
    FEATURED_BENRI_TOOLS[2],
    FEATURED_BENRI_TOOLS[1],
  ],
  "why-japanese-people-bow-instead-of-shaking-hands": [FEATURED_BENRI_TOOLS[2]],
  "why-japanese-packaging-is-so-careful": [
    FEATURED_BENRI_TOOLS[4],
    FEATURED_BENRI_TOOLS[3],
  ],
  "why-japanese-convenience-stores-have-so-many-services": [FEATURED_BENRI_TOOLS[3]],
  "why-japanese-homes-feel-different-from-western-homes": [FEATURED_BENRI_TOOLS[4]],
  "why-japanese-toilets-have-so-many-buttons": [FEATURED_BENRI_TOOLS[3]],
};

export function getRelatedToolsForArticle(slug: string): CrossLinkItem[] {
  return ARTICLE_TO_TOOLS[slug] ?? FEATURED_BENRI_TOOLS.slice(0, 3);
}
