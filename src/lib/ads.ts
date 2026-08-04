export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";

export const ADSENSE_SLOTS = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP?.trim() ?? "",
  "in-content": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_CONTENT?.trim() ?? "",
  bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM?.trim() ?? "",
} as const;

export type AdSlotName = keyof typeof ADSENSE_SLOTS;

export function isAdsEnabled(): boolean {
  return Boolean(ADSENSE_CLIENT);
}
