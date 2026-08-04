"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOTS, type AdSlotName } from "@/lib/ads";

type AdSlotProps = {
  slot: AdSlotName;
  className?: string;
  format?: "auto" | "rectangle" | "horizontal";
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSense unit.
 * - Dev / no client: dashed placeholder (layout reserved for ads)
 * - Prod + client + slot ID: real ad unit
 * - Prod + client, no slot ID: reserved space (Auto ads may fill elsewhere)
 */
export function AdSlot({ slot, className = "", format = "auto" }: AdSlotProps) {
  const pushed = useRef(false);
  const clientId = ADSENSE_CLIENT;
  const slotId = ADSENSE_SLOTS[slot];
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!clientId || !slotId || isDev || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (error) {
      console.warn("[ads] push failed", error);
    }
  }, [clientId, slotId, isDev]);

  if (isDev || !clientId) {
    return (
      <aside
        aria-label="広告プレースホルダー"
        data-ad-slot={slot}
        className={`flex min-h-[90px] items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--color-border)] bg-[var(--ad-slot-bg)] text-xs text-[var(--color-muted)] ${className}`}
      >
        広告枠（{slot}）
      </aside>
    );
  }

  if (!slotId) {
    return (
      <aside
        aria-hidden
        data-ad-slot={slot}
        className={`min-h-[90px] ${className}`}
      />
    );
  }

  return (
    <aside
      aria-label="広告"
      data-ad-slot={slot}
      className={`min-h-[90px] overflow-hidden ${className}`}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
