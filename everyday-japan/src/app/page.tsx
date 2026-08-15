import type { Metadata } from "next";
import Link from "next/link";
import { SisterSiteLinks } from "@/components/SisterSiteLinks";
import { FEATURED_BENRI_TOOLS } from "@/lib/cross-links";
import { getPublishedArticles, getReviewArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Everyday Japan — Ordinary Japanese Life, Explained",
  description:
    "Understand the ordinary details of Japanese life—from language and etiquette to trains, shops, food, and neighborhoods.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const articles = getPublishedArticles();
  const inReview = getReviewArticles();

  return (
    <>
      <header className="site-header">
        <Link href="/" className="site-logo">
          Everyday Japan
        </Link>
        <span>Ordinary life, explained.</span>
      </header>

      <main className="home-shell">
        <section className="home-intro">
          <p className="eyebrow">A local perspective on daily life</p>
          <h1>The Japan people visit—and the everyday life locals rarely explain.</h1>
          <p>
            Calm, practical stories about why ordinary things in Japan work the way they do.
          </p>
        </section>

        <section className="article-list" aria-labelledby="latest">
          <h2 id="latest">Published</h2>
          {articles.map((article) => (
            <article key={article.slug} className="article-card">
              <p>{article.category}</p>
              <h3>
                <Link href={`/${article.slug}`}>{article.title}</Link>
              </h3>
              <span>{article.description}</span>
              <Link className="read-link" href={`/${article.slug}`}>
                Read the story →
              </Link>
            </article>
          ))}
        </section>

        {inReview.length > 0 && (
          <section className="article-list" aria-labelledby="review">
            <h2 id="review">In editorial review ({inReview.length})</h2>
            {inReview.map((article) => (
              <article key={article.slug} className="article-card">
                <p>{article.category}</p>
                <h3>
                  <Link href={`/${article.slug}`}>{article.title}</Link>
                </h3>
                <span>{article.description}</span>
                <Link className="read-link" href={`/${article.slug}`}>
                  Preview draft →
                </Link>
              </article>
            ))}
            <p className="mt-6 text-sm text-[var(--muted)]">
              Editors: open the{" "}
              <Link className="underline" href="/os">
                factory dashboard
              </Link>{" "}
              to approve or request rewrites.
            </p>
          </section>
        )}

        <SisterSiteLinks items={FEATURED_BENRI_TOOLS} />
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Everyday Japan</p>
        <SisterSiteLinks variant="footer" />
      </footer>
    </>
  );
}
