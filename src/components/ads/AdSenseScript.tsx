import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/ads";

/** Loads AdSense script once when NEXT_PUBLIC_ADSENSE_CLIENT is set. */
export function AdSenseScript() {
  if (!ADSENSE_CLIENT) return null;

  return (
    <Script
      id="adsense-init"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
