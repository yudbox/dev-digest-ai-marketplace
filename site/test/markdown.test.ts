import { renderMarkdown } from "../src/lib/markdown";

describe("markdown", () => {
  it("AC-34: no script, event handlers or javascript: links", () => {
    const html = renderMarkdown(
      '# T\n\n<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://example.com)'
    );
    const div = document.createElement("div");
    div.innerHTML = html;
    expect(div.querySelector("script")).toBeNull();
    expect(div.querySelector("[onerror]")).toBeNull();
    expect([...div.querySelectorAll("a")].some((a) => (a.getAttribute("href") ?? "").startsWith("javascript:"))).toBe(false);
    const ext = div.querySelector('a[href="https://example.com"]')!;
    expect(ext.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("drops frontmatter", () => {
    expect(renderMarkdown("---\nname: x\n---\n\nHello")).toBe("<p>Hello</p>\n");
  });
});
