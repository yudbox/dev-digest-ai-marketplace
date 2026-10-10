import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

// Plugin markdown is written by plugin authors and rendered in the visitor's
// browser: raw HTML is off in markdown-it and the output is sanitized (AC-34).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

let hooked = false;
function ensureHook() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node instanceof HTMLAnchorElement) {
      const href = node.getAttribute("href") ?? "";
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
}

/** Removes a leading YAML frontmatter block; its fields are shown separately. */
export function stripFrontmatter(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function renderMarkdown(text: string): string {
  ensureHook();
  const html = md.render(stripFrontmatter(text));
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\.{0,2}\/|[^:]*$)/i,
  });
}
