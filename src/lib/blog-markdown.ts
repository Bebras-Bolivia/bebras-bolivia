import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

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

  const formatted = transformImageTags(html).replace(/<hr\s*\/?>/g, '<div class="rule-line post-divider"></div>');

  return sanitizeHtml(formatted, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "p", "br", "blockquote", "pre", "code",
      "strong", "em", "del", "ul", "ol", "li", "table", "thead", "tbody",
      "tr", "th", "td", "a", "figure", "img", "div", "input",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      code: ["class"],
      div: ["class"],
      figure: ["class"],
      img: ["src", "alt", "title", "loading", "decoding"],
      input: ["type", "checked", "disabled"],
      li: ["class"],
      ul: ["class"],
    },
    allowedClasses: {
      code: [/^language-[a-z0-9_-]+$/i],
      div: ["rule-line", "post-divider"],
      figure: ["post-image", "post-image--sm", "post-image--md", "post-image--lg", "post-image--full"],
      li: ["task-list-item"],
      ul: ["contains-task-list"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: attribs.target === "_blank"
          ? { ...attribs, rel: "noopener noreferrer" }
          : attribs,
      }),
    },
  });
}
