import { describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/features/resume/model/index";
import { DOCUMENT_VERSION } from "@/features/resume/model/document";

import { migrateDocument } from "./documents";

/**
 * Migrations are the one place a user's stored resume is rewritten by code they
 * never ran. So each test here checks two things: that the shape is upgraded,
 * and that the content is the same content afterwards.
 */

/** A v1 document: identical to a current one except that a bullet list's items
 * are bare `InlineText` arrays rather than `{ text }` objects. */
const v1 = (): Record<string, unknown> => {
  const document = createEmptyDocument("classic") as unknown as Record<
    string,
    unknown
  >;

  return {
    ...structuredClone(document),
    schemaVersion: 1,
    content: {
      header: { name: [{ type: "text", text: "Ada" }], contacts: [] },
      sections: [
        {
          id: "s1",
          kind: "skills",
          title: [{ type: "text", text: "Skills" }],
          blocks: [
            {
              id: "b1",
              kind: "bulletList",
              items: [
                [{ type: "text", text: "Go" }],
                [{ type: "text", text: "Rust" }],
              ],
            },
          ],
        },
      ],
    },
  };
};

describe("migrateDocument", () => {
  it("reads a current document without changing it", () => {
    const current = createEmptyDocument("classic");
    const { document, migrated } = migrateDocument(current);

    expect(migrated).toBe(false);
    expect(document).toEqual(current);
  });

  it("wraps v1 bullet items and keeps their text", () => {
    const { document, migrated } = migrateDocument(v1());
    const block = document.content.sections[0]?.blocks[0];

    expect(migrated).toBe(true);
    expect(document.schemaVersion).toBe(DOCUMENT_VERSION);
    expect(
      block?.kind === "bulletList"
        ? block.items.map((item) => item.text)
        : undefined,
    ).toEqual([
      [{ type: "text", text: "Go" }],
      [{ type: "text", text: "Rust" }],
    ]);
  });

  it("does not write into the record it was given", () => {
    const stored = v1();
    const before = structuredClone(stored);

    migrateDocument(stored);

    expect(stored).toEqual(before);
  });

  it("refuses a document from a newer build", () => {
    expect(() =>
      migrateDocument({
        ...(createEmptyDocument("classic") as unknown as Record<
          string,
          unknown
        >),
        schemaVersion: DOCUMENT_VERSION + 1,
      }),
    ).toThrow(/newer version/);
  });
});
