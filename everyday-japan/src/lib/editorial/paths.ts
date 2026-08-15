import fs from "node:fs";
import path from "node:path";
import { PIPELINE_ORDER, STAGE_FILES } from "@/types/editorial";

export function draftsRoot(cwd = process.cwd()): string {
  return path.join(cwd, "content", "drafts");
}

export function articlesRoot(cwd = process.cwd()): string {
  return path.join(cwd, "content", "articles");
}

export function templatesRoot(cwd = process.cwd()): string {
  return path.join(cwd, "editorial", "templates");
}

export function draftDir(slug: string, cwd = process.cwd()): string {
  return path.join(draftsRoot(cwd), slug);
}

export function listDraftSlugs(cwd = process.cwd()): string[] {
  const root = draftsRoot(cwd);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

export function listPublishedSlugs(cwd = process.cwd()): string[] {
  const root = articlesRoot(cwd);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => f.replace(/\.(md|mdx)$/, ""))
    .sort();
}

function looksLikeScaffold(stage: string, body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return true;
  if (trimmed.includes("{{TITLE}}") || trimmed.includes("{{SLUG}}")) return true;

  switch (stage) {
    case "topic":
      return /\*\*Title:\*\*\s*(\n\s*\n|$)/.test(body);
    case "research":
      return /## Facts\n\n-\n/.test(body);
    case "outline":
      return /- Scene:\s*\n/.test(body) || /- Scene:\s*$/m.test(body);
    case "draft":
      return body.includes("<!-- 1. Hook") || /title:\s*""/.test(body);
    case "seo":
      return /## SEO Title\n\n<!--/.test(body) || /## SEO Title\n\n\n/.test(body);
    case "fact-check":
      return /\|\s*\|\s*verified\s*\|\s*\|/.test(body);
    case "review":
      return /\*\*Reviewer:\*\*\s*\n/.test(body) || /\*\*Reviewer:\*\*\s*$/m.test(body);
    default:
      return false;
  }
}

export function stageStatus(slug: string, cwd = process.cwd()) {
  const dir = draftDir(slug, cwd);
  return PIPELINE_ORDER.map((stage) => {
    const file = STAGE_FILES[stage];
    const full = path.join(dir, file);
    const exists = fs.existsSync(full);
    const body = exists ? fs.readFileSync(full, "utf8") : "";
    const empty = !exists || body.trim().length === 0;
    const scaffold = exists && !empty && looksLikeScaffold(stage, body);
    return { stage, file, exists, empty, scaffold };
  });
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
