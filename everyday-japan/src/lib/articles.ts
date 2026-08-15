import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ArticleStatus = "published" | "review" | "draft";

export interface ArticleMeta {
  title: string;
  seo_title: string;
  description: string;
  slug: string;
  category: string;
  tags: string[];
  published_at: string;
  updated_at: string;
  status: ArticleStatus;
  hero_prompt: string;
  og_image: string;
  editorial_score_path?: string;
}

export interface Article {
  meta: ArticleMeta;
  content: string;
}

const packagedArticlesDirectory = path.join(process.cwd(), "content", "articles");
const flatArticlesDirectory = path.join(process.cwd(), "articles");

function articleFile(slug: string): string | null {
  const packaged = path.join(packagedArticlesDirectory, slug, "article.md");
  if (fs.existsSync(packaged)) return packaged;
  const flat = path.join(flatArticlesDirectory, `${slug}.md`);
  if (fs.existsSync(flat)) return flat;
  return null;
}

export function listArticleSlugs(): string[] {
  const slugs = new Set<string>();
  if (fs.existsSync(packagedArticlesDirectory)) {
    for (const name of fs.readdirSync(packagedArticlesDirectory)) {
      if (fs.existsSync(path.join(packagedArticlesDirectory, name, "article.md"))) {
        slugs.add(name);
      }
    }
  }
  if (fs.existsSync(flatArticlesDirectory)) {
    for (const file of fs.readdirSync(flatArticlesDirectory)) {
      if (file.endsWith(".md")) slugs.add(file.replace(/\.md$/, ""));
    }
  }
  return [...slugs].sort();
}

export function getArticle(slug: string): Article | null {
  const file = articleFile(slug);
  if (!file) return null;

  const parsed = matter(fs.readFileSync(file, "utf8"));
  return {
    meta: parsed.data as ArticleMeta,
    content: parsed.content,
  };
}

export function getPublishedArticles(): ArticleMeta[] {
  return listArticleSlugs()
    .map((slug) => getArticle(slug))
    .filter((article): article is Article => article?.meta.status === "published")
    .map((article) => article.meta)
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
}

export function getReviewArticles(): ArticleMeta[] {
  return listArticleSlugs()
    .map((slug) => getArticle(slug))
    .filter((article): article is Article => article?.meta.status === "review")
    .map((article) => article.meta)
    .sort((a, b) => a.title.localeCompare(b.title));
}
