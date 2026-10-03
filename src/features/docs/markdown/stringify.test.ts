import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { remarkLLMs } from "fumadocs-core/mdx-plugins/remark-llms";
import { unified } from "unified";
import { VFile } from "vfile";
import { describe, expect, it } from "vitest";

import { docsMarkdownOptions } from "./stringify";

/**
 * Runs Fumadocs' own `remarkLLMs` with the site's options over MDX text, which
 * is what the build does to every page. The result is what `getText("processed")`
 * returns.
 */
const toMarkdown = (mdx: string): string => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkLLMs, { ...docsMarkdownOptions, _data: true });
  const file = new VFile(mdx);

  processor.runSync(processor.parse(file), file);

  return String((file.data as { markdown?: string }).markdown);
};

describe("docs Markdown", () => {
  it("writes a callout as a quote with its kind and title", () => {
    const out = toMarkdown(
      '<Callout type="warning" title="Mind the colons">\n  A directive never follows a word.\n</Callout>',
    );

    expect(out).toContain("> **Mind the colons**");
    expect(out).toContain("> A directive never follows a word.");
    expect(out).not.toContain("<Callout");
  });

  it("keeps a one-line callout's code span in the same paragraph", () => {
    expect(
      toMarkdown("<Callout>Each `##` heading starts a section.</Callout>"),
    ).toContain("> Each `##` heading starts a section.");
  });

  it("writes lists with hyphens", () => {
    expect(toMarkdown("* one\n* two")).toContain("- one\n- two");
  });

  it("names a callout's kind when it has no title", () => {
    expect(toMarkdown("<Callout>Plain.</Callout>")).toContain("> **Note**");
  });

  it("writes cards as a list of links", () => {
    const out = toMarkdown(
      '<Cards>\n<Card title="The format" href="/docs/format/overview">One file.</Card>\n<Card title="Search" href="/docs">Find it.</Card>\n</Cards>',
    );

    expect(out).toContain("- [The format](/docs/format/overview): One file.");
    expect(out).toContain("- [Search](/docs): Find it.");
    expect(out).not.toContain("<Card");
  });

  it("labels each tab and keeps its content", () => {
    const out = toMarkdown(
      '<Tabs items={["macOS", "Windows"]}>\n<Tab value="macOS">\n\nUse one.\n\n</Tab>\n<Tab value="Windows">\n\nUse two.\n\n</Tab>\n</Tabs>',
    );

    expect(out).toContain("**macOS**");
    expect(out).toContain("Use one.");
    expect(out).toContain("**Windows**");
    expect(out).not.toContain("<Tab");
  });

  it("keeps the headings inside steps", () => {
    const out = toMarkdown(
      "<Steps>\n<Step>\n\n### Open the editor\n\nPress a key.\n\n</Step>\n</Steps>",
    );

    expect(out).toContain("### Open the editor");
    expect(out).toContain("Press a key.");
    expect(out).not.toContain("<Step");
  });

  it("writes a key as code", () => {
    expect(toMarkdown("Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>.")).toContain(
      "Press `Ctrl` + `K`.",
    );
  });

  it("reduces a component it has never heard of to its children", () => {
    const out = toMarkdown("<Mystery>inside</Mystery>");

    expect(out).toContain("inside");
    expect(out).not.toContain("<");
  });

  it("keeps code fences, tables and their info strings", () => {
    const out = toMarkdown(
      '```resume title="resume.md"\n# Ada\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |',
    );

    expect(out).toContain('```resume title="resume.md"');
    expect(out).toMatch(/\| a\s+\| b\s+\|/);
  });

  it("drops import and export lines", () => {
    expect(toMarkdown('import X from "x"\n\nHello')).not.toContain("import");
  });
});
