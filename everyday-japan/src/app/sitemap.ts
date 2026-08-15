import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...getPublishedArticles().map((article) => ({
      url: `${siteUrl}/${article.slug}`,
      lastModified: new Date(`${article.updated_at}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
  ];
}
