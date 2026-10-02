import { toHtml } from "hast-util-to-html";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { rehypeHighlight } from "./rehypeHighlight";

const render = async (markdown: string): Promise<string> => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeHighlight);
  const tree = await processor.run(processor.parse(markdown));

  return toHtml(tree);
};

const fence = (info: string, body: string) => `\`\`\`${info}\n${body}\n\`\`\``;

describe("rehypeHighlight", () => {
  it("colours a registered language and marks the block with it", async () => {
    const html = await render(fence("css", "a { color: red; }"));

    expect(html).toContain('<pre data-language="css">');
    expect(html).toContain('class="hljs language-css"');
    expect(html).toContain("hljs-selector-tag");
  });

  it("reads a title from the meta string and keeps it off the code", async () => {
    const html = await render(fence('resume title="resume.md"', "# Ada"));

    expect(html).toContain('data-title="resume.md"');
    expect(html).not.toContain('title="resume.md"</');
  });

  it("ignores meta words that are only for the content tests", async () => {
    const html = await render(fence("resume warns", "# Ada\n\n<div>x</div>"));

    expect(html).toContain('data-language="resume"');
    expect(html).not.toContain("data-title");
    expect(html).not.toContain("warns");
  });

  it("shows plain text, an unknown language and a bare fence unhighlighted", async () => {
    for (const info of ["text", "reusme", ""]) {
      const html = await render(fence(info, "::x[y]"));

      expect(html).not.toContain("hljs-");
      expect(html).toContain(
        `data-language="${info === "text" || info === "" ? "text" : "reusme"}"`,
      );
    }
  });

  it("resolves the aliases people type", async () => {
    expect(await render(fence("sh", "echo hi"))).toContain("language-sh");
    expect(await render(fence("md", "# Hi"))).toContain("hljs-section");
  });

  it("leaves inline code, which is not in a pre, alone", async () => {
    const html = await render("Use `::contact` here.");

    expect(html).toBe("<p>Use <code>::contact</code> here.</p>");
  });
});

describe("the resume grammar", () => {
  const spans = async (body: string) => render(fence("resume", body));

  it("marks a directive's name, its label and its attributes", async () => {
    const html = await spans("::contact[ada@example.com]{icon=envelope}");

    expect(html).toContain('<span class="hljs-keyword">::contact</span>');
    expect(html).toContain(
      '<span class="hljs-string">[ada@example.com]</span>',
    );
    expect(html).toContain('<span class="hljs-attr">icon</span>');
  });

  it("keeps a label with spaces and a quoted value in one piece", async () => {
    const html = await spans('::contact[Ada Lovelace]{title="Head of maths"}');

    expect(html).toContain('<span class="hljs-string">[Ada Lovelace]</span>');
    expect(html).toContain('<span class="hljs-string">"Head of maths"</span>');
  });

  it("marks a container directive and its closing fence", async () => {
    const html = await spans(":::entry{start=2020-01}\nBuilt a thing.\n:::");

    expect(html).toContain('<span class="hljs-keyword">:::entry</span>');
    expect(html).toContain('<span class="hljs-keyword">:::</span>');
  });

  it("marks an inline directive in a sentence", async () => {
    const html = await spans("Based in :icon{name=map-pin} Jakarta.");

    expect(html).toContain('<span class="hljs-keyword">:icon</span>');
  });

  it("does not read ordinary colons as directives", async () => {
    const html = await spans("Note: this is fine at 10:30 and http://x.test");

    expect(html).not.toContain("hljs-keyword");
  });

  it("still highlights plain Markdown around the directives", async () => {
    const html = await spans("# Ada Lovelace\n\n## Summary");

    expect(html).toContain("hljs-section");
  });
});
