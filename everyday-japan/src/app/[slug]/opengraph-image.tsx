import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";

export const alt = "Everyday Japan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  const title = article?.meta.title ?? "Everyday Japan";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0b1930",
          color: "#f8f2e7",
          padding: "64px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid rgba(248,242,231,.28)",
            padding: "54px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 28 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#d55b4d",
              }}
            />
            Everyday Japan
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 930,
              fontSize: title.length > 60 ? 52 : 64,
              lineHeight: 1.08,
              letterSpacing: "-2px",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#b7c4d6" }}>
            Ordinary life, explained.
          </div>
        </div>
      </div>
    ),
    size
  );
}
