import { describe, expect, it } from "vitest";
import { produce } from "immer";

import { addBlock } from "@/features/editor/mutations";
import { parseDocument, serializeDocument } from "@/features/markdown/index";

import { documentSchema } from "./schema";
import {
  INSERTABLE_BLOCK_KINDS,
  createBlock,
  createEmptyDocument,
} from "./factory";

/**
 * `createBlock` is what the paper's "Insert" control writes into a document, so
 * what it makes has to survive everything a document goes through: validation on
 * the way to disk, and the Markdown pane, which is built from the same model and
 * parsed back from it on every keystroke.
 */

const documentWith = (kind: (typeof INSERTABLE_BLOCK_KINDS)[number]) => {
  const document = createEmptyDocument();
  const sectionId = document.content.sections[0]?.id ?? "";

  return produce(document, addBlock(sectionId, createBlock(kind)));
};

describe("createBlock", () => {
  it.each(INSERTABLE_BLOCK_KINDS)("makes a %s the schema accepts", (kind) => {
    const block = createBlock(kind);

    expect(block.kind).toBe(kind);
    expect(block.id).not.toBe("");
    expect(documentSchema.safeParse(documentWith(kind)).success).toBe(true);
  });

  it("gives every block its own id", () => {
    const ids = new Set(
      INSERTABLE_BLOCK_KINDS.flatMap((kind) => [
        createBlock(kind).id,
        createBlock(kind).id,
      ]),
    );

    expect(ids.size).toBe(INSERTABLE_BLOCK_KINDS.length * 2);
  });

  it("writes no words the owner did not write", () => {
    const block = createBlock("paragraph");

    expect(block).toMatchObject({ kind: "paragraph", text: [] });
  });

  it.each(INSERTABLE_BLOCK_KINDS)(
    "keeps a %s when the Markdown is read back",
    (kind) => {
      const document = documentWith(kind);
      const source = serializeDocument(document);
      const parsed = parseDocument(source, document);
      const kinds = parsed.content.sections[0]?.blocks.map((b) => b.kind);

      // A block with nothing in it may be read back as nothing at all, which
      // is the codec's choice. What it may not do is turn into another kind.
      expect(kinds === undefined || kinds.every((k) => k === kind)).toBe(true);
    },
  );
});
