import { describe, expect, it } from "vitest";

import { resolveHeadingIds } from "./anchors";

describe("resolveHeadingIds", () => {
  it("removes the id and points links at the heading's own slug", () => {
    const out = resolveHeadingIds(
      "## What a section holds [#sections]\n\nSee [it](#sections).",
    );

    expect(out).toBe(
      "## What a section holds\n\nSee [it](#what-a-section-holds).",
    );
  });

  it("numbers a repeated title the way a renderer will", () => {
    const out = resolveHeadingIds(
      "## Notes\n\n## Notes [#second]\n\n[b](#second)",
    );

    expect(out).toContain("[b](#notes-1)");
  });

  it("leaves a link whose id is unknown, and links into other pages", () => {
    const text = "[a](#nowhere) [b](/en/docs/x.md#y)";

    expect(resolveHeadingIds(text)).toBe(text);
  });

  it("leaves headings without an id as they are", () => {
    expect(resolveHeadingIds("### Open the editor")).toBe(
      "### Open the editor",
    );
  });

  it("does not touch fenced code", () => {
    const text = "```md\n## Keep [#me]\n[x](#me)\n```";

    expect(resolveHeadingIds(text)).toBe(text);
  });
});
