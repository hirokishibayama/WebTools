import { ADSENSE_CLIENT } from "@/lib/ads";

/**
 * Serves /ads.txt for AdSense.
 * Set NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXX
 */
export function GET() {
  const lines: string[] = [];

  if (ADSENSE_CLIENT) {
    const pubId = ADSENSE_CLIENT.replace(/^ca-/, "");
    lines.push(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0`);
  } else {
    lines.push("# Set NEXT_PUBLIC_ADSENSE_CLIENT to enable AdSense ads.txt");
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
