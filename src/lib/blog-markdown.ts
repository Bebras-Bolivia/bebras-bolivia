import { marked } from "marked";

const IMAGE_SIZE_SET = new Set(["sm", "md", "lg", "full"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function transformImageTags(html: string): string {
  return html.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*?)alt="([^"]*)"([^>]*?)>/g, (_match, beforeSrc, src, between, alt, afterAlt) => {
    const rawAlt = alt || "";
    const parts = rawAlt.split("|");
    const maybeSize = parts.at(-1)?.trim().toLowerCase() || "";
    const size = IMAGE_SIZE_SET.has(maybeSize) ? maybeSize : "full";
    const cleanAlt = IMAGE_SIZE_SET.has(maybeSize) ? parts.slice(0, -1).join("|").trim() : rawAlt.trim();
    const titleMatch = `${beforeSrc}${between}${afterAlt}`.match(/title="([^"]*)"/);
    const titleAttr = titleMatch?.[1] ? ` title="${escapeHtml(titleMatch[1])}"` : "";

    return `<figure class="post-image post-image--${size}"><img src="${escapeHtml(src)}" alt="${escapeHtml(cleanAlt || "Imagen")}"${titleAttr} loading="lazy" decoding="async"></figure>`;
  });
}

export function renderBlogMarkdown(markdown: string): string {
  const html = marked.parse(markdown || "", {
    gfm: true,
    breaks: true,
  }) as string;

  return transformImageTags(html);
}
