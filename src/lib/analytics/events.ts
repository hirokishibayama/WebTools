type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export type AnalyticsEvent =
  | { name: "tool_start"; tool: string }
  | { name: "tool_complete"; tool: string; meta?: Record<string, string | number | boolean> }
  | { name: "copy_click"; tool: string }
  | { name: "download_click"; tool: string };

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  const payload = {
    event_category: "tool",
    tool_slug: "tool" in event ? event.tool : undefined,
    ...("meta" in event && event.meta ? event.meta : {}),
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", event.name, payload);
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event.name, payload);
  }
}
