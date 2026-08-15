import fs from "node:fs";
import path from "node:path";
import type { AgentResult } from "../../types";
import { defineAgent, manifestOrStub } from "../_util";
import { loadPrompt } from "../prompt";
import { ensureDir, readJson, resolvePath, writeJson, isoNow } from "../../store/fs";

const agent = defineAgent({
  manifest: manifestOrStub("publish", { queue: "publish" }),
  async run(_ctx, input): Promise<AgentResult> {
    const prompt = loadPrompt(agent.manifest.prompt ?? "editorial/prompts/os/publish.md");
    const slug = String(input.slug ?? "untitled");
    const title = String(input.title ?? slug);
    const draftPath = input.draft_path
      ? resolvePath(String(input.draft_path))
      : resolvePath("assets", slug, "draft.md");
    const seo = readJson<{
      seo_title?: string;
      meta_description?: string;
      tags?: string[];
    }>(resolvePath("assets", slug, "seo.json"), {});
    const images = readJson<{ ogp?: string; hero?: string }>(
      resolvePath("assets", slug, "image-prompts.json"),
      {}
    );
    const links = readJson<{ related?: unknown[] }>(
      resolvePath("assets", slug, "internal-links.json"),
      {}
    );

    const body = fs.existsSync(draftPath)
      ? fs.readFileSync(draftPath, "utf8")
      : `# ${title}\n\n(Missing draft)\n`;

    const articleDir = resolvePath("articles");
    ensureDir(articleDir);
    const articlePath = path.join(articleDir, `${slug}.md`);
    const published = `---
title: "${seo.seo_title ?? title}"
slug: "${slug}"
description: "${seo.meta_description ?? ""}"
tags: ${JSON.stringify(seo.tags ?? [])}
status: published
published_at: "${isoNow()}"
ogp_prompt: ${JSON.stringify(images.ogp ?? "")}
---

${body.replace(/^---[\s\S]*?---\n*/, "")}
`;

    fs.writeFileSync(articlePath, published);

    const sitemapPath = resolvePath("data/index/sitemap.json");
    const sitemap = readJson<{ urls: { slug: string; path: string; updated_at: string }[] }>(
      sitemapPath,
      { urls: [] }
    );
    sitemap.urls = [
      ...sitemap.urls.filter((u) => u.slug !== slug),
      { slug, path: `articles/${slug}.md`, updated_at: isoNow() },
    ];
    writeJson(sitemapPath, sitemap);

    writeJson(resolvePath("assets", slug, "publish-meta.json"), {
      slug,
      title,
      article_path: `articles/${slug}.md`,
      related: links.related ?? [],
      ogp_prompt: images.ogp,
      hero_prompt: images.hero,
      published_at: isoNow(),
    });

    return {
      ok: true,
      output: {
        slug,
        article_path: `articles/${slug}.md`,
        sitemap_updated: true,
      },
      artifacts: [
        { kind: "article", path: `articles/${slug}.md` },
        { kind: "sitemap", path: "data/index/sitemap.json" },
      ],
      prompt_versions: { publish: prompt.version },
      cost: { actual_cost: 0.002, tokens: 100, duration_ms: 50 },
      quality_score: Number(input.quality_score ?? 80),
      enqueue: [],
    };
  },
});

export default agent;
