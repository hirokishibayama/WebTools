import type { CrossLinkItem } from "@/lib/cross-links";
import { BENRI_HOME, BENRI_TOOLS_LIST } from "@/lib/cross-links";

type SisterSiteLinksProps = {
  items?: CrossLinkItem[];
  title?: string;
  description?: string;
  variant?: "section" | "footer";
};

export function SisterSiteLinks({
  items,
  title = "Sister site: Benri Toolbox",
  description = "Free online tools for Japanese text, PDFs, images, and AI proofreading—handy while you read about daily life in Japan.",
  variant = "section",
}: SisterSiteLinksProps) {
  if (variant === "footer") {
    return (
      <p className="sister-footer-link">
        Also explore{" "}
        <a href={BENRI_HOME.href} rel="noopener noreferrer">
          {BENRI_HOME.title}
        </a>{" "}
        — free utility tools for Japan.
      </p>
    );
  }

  const toolLinks = (items ?? []).filter((item) => item.href !== BENRI_HOME.href);

  return (
    <section className="sister-links" aria-labelledby="sister-links-heading">
      <h2 id="sister-links-heading">{title}</h2>
      <p>{description}</p>
      <ul>
        <li>
          <a href={BENRI_TOOLS_LIST.href} rel="noopener noreferrer">
            Browse all tools →
          </a>
        </li>
        {toolLinks.map((item) => (
          <li key={item.href}>
            <a href={item.href} rel="noopener noreferrer">
              {item.title}
            </a>
            {item.description ? <span> — {item.description}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
