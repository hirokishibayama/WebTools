import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { SisterSiteLinks } from "@/components/SisterSiteLinks";
import { getArticle, listArticleSlugs } from "@/lib/articles";
import { getRelatedToolsForArticle } from "@/lib/cross-links";

export function generateStaticParams() {
  return listArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  const robots =
    article.meta.status === "published"
      ? undefined
      : { index: false, follow: false };

  return {
    title: article.meta.seo_title,
    description: article.meta.description,
    keywords: article.meta.tags,
    robots,
    alternates: { canonical: `/${article.meta.slug}` },
    openGraph: {
      type: "article",
      title: article.meta.title,
      description: article.meta.description,
      url: `/${article.meta.slug}`,
      publishedTime: article.meta.published_at,
      modifiedTime: article.meta.updated_at,
      images: [{ url: article.meta.og_image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.meta.title,
      description: article.meta.description,
      images: [article.meta.og_image],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "os" || slug === "api") notFound();

  const article = getArticle(slug);
  if (!article) notFound();

  const { content } = await compileMDX({
    source: article.content,
    components: {
      a: ({ href, children }) => (
        <a href={href} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>
          {children}
        </a>
      ),
    },
  });

  const relatedTools = getRelatedToolsForArticle(slug);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.meta.title,
    description: article.meta.description,
    datePublished: article.meta.published_at,
    dateModified: article.meta.updated_at,
    mainEntityOfPage: `/${article.meta.slug}`,
    author: { "@type": "Organization", name: "Everyday Japan" },
    publisher: { "@type": "Organization", name: "Everyday Japan" },
    inLanguage: "en",
  };

  return (
    <>
      <header className="site-header">
        <Link href="/" className="site-logo">
          Everyday Japan
        </Link>
        <span>Ordinary life, explained.</span>
      </header>

      <main>
        <article className="article-shell">
          <div className="article-kicker">{article.meta.category}</div>
          {article.meta.status !== "published" && (
            <p className="mb-4 text-sm text-[var(--muted)]">Status: {article.meta.status} (preview)</p>
          )}
          <div className="article-content">{content}</div>
          <footer className="article-footer">
            <p>
              {article.meta.status === "published" ? "Published" : "Updated"}{" "}
              {new Date(`${article.meta.updated_at}T00:00:00Z`).toLocaleDateString("en", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <Link href="/">← Back to Everyday Japan</Link>
          </footer>

          <SisterSiteLinks
            items={relatedTools}
            title="Useful tools while reading"
            description="Free utilities from Benri Toolbox—character count, conversion, compression, and Japanese AI proofreading."
          />
        </article>
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Everyday Japan</p>
        <SisterSiteLinks variant="footer" />
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </>
  );
}
