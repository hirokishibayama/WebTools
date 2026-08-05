import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { ToolRunner } from "@/components/tools/ToolRunner";
import { getAllSlugs, getToolBySlug } from "@/tools/registry";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};

  return {
    title: tool.seo.title,
    description: tool.seo.description,
    keywords: tool.keywords,
    openGraph: {
      title: tool.seo.title,
      description: tool.seo.description,
    },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <Container>
      <ToolPageShell tool={tool}>
        <ToolRunner slug={slug} />
      </ToolPageShell>
    </Container>
  );
}
