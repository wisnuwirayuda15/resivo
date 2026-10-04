import { describe, expect, it } from "vitest";
import { produce } from "immer";

import {
  createEmptyDocument,
  plainText,
  text,
} from "@/features/resume/model/index";
import { documentSchema } from "@/features/resume/model/schema";
import { templateDefaults } from "@/features/templates/defaults";

import * as edit from "./mutations";

import type { Recipe } from "./mutations";
import type { Block, ResumeDocument } from "@/features/resume/model/document";

/** Applies a recipe the same way the store does. */
const apply = (document: ResumeDocument, ...recipes: Array<Recipe>) =>
  recipes.reduce((current, recipe) => produce(current, recipe), document);

const titles = (document: ResumeDocument) =>
  document.content.sections.map((section) => plainText(section.title));

describe("header edits", () => {
  it("sets the name", () => {
    const next = apply(
      createEmptyDocument(),
      edit.setHeaderName(text("Avery")),
    );

    expect(plainText(next.content.header.name)).toBe("Avery");
  });

  it("adds, edits and removes a contact", () => {
    const added = apply(
      createEmptyDocument(),
      edit.addContact("a@example.com"),
    );
    const contact = added.content.header.contacts[0];

    expect(plainText(contact?.label ?? [])).toBe("a@example.com");

    const edited = apply(
      added,
      edit.updateContactLabel(contact?.id ?? "", text("b@example.com")),
    );
    expect(plainText(edited.content.header.contacts[0]?.label ?? [])).toBe(
      "b@example.com",
    );

    const removed = apply(edited, edit.removeContact(contact?.id ?? ""));
    expect(removed.content.header.contacts).toEqual([]);
  });

  it("sets and clears a contact icon and link", () => {
    const added = apply(createEmptyDocument(), edit.addContact("ada@x.com"));
    const id = added.content.header.contacts[0]?.id ?? "";

    const decorated = apply(
      added,
      edit.setContactIcon(id, { library: "phosphor", name: "envelope" }),
      edit.setContactHref(id, " https://example.com "),
    );

    expect(decorated.content.header.contacts[0]?.icon?.name).toBe("envelope");
    expect(decorated.content.header.contacts[0]?.href).toBe(
      "https://example.com",
    );

    // Both clear by deleting the key, so the document never carries a field
    // holding `undefined`, which the schema would reject on the way to disk.
    const cleared = apply(
      decorated,
      edit.setContactIcon(id, undefined),
      edit.setContactHref(id, "   "),
    );
    const contact = cleared.content.header.contacts[0];

    expect(contact === undefined ? true : "icon" in contact).toBe(false);
    expect(contact === undefined ? true : "href" in contact).toBe(false);
    expect(documentSchema.safeParse(cleared).success).toBe(true);
  });

  it("clears the avatar by removing the key rather than storing undefined", () => {
    const set = apply(createEmptyDocument(), edit.setAvatarImage("image-1"));
    const cleared = apply(set, edit.setAvatarImage(undefined));

    expect("avatarImageId" in cleared.content.header).toBe(false);
    expect(documentSchema.safeParse(cleared).success).toBe(true);
  });
});

describe("meta edits", () => {
  it("sets the document locale", () => {
    const next = apply(createEmptyDocument(), edit.setLocale("id"));

    expect(next.meta.locale).toBe("id");
    expect(documentSchema.safeParse(next).success).toBe(true);
  });

  it("refuses a tag too short to be one", () => {
    // The schema's floor is two characters. A recipe that wrote 'e' would
    // produce a document that fails validation on save, long after the edit.
    const next = apply(createEmptyDocument(), edit.setLocale("e"));

    expect(next.meta.locale).toBe("en");
  });
});

describe("section edits", () => {
  it("appends a section by default", () => {
    const next = apply(
      createEmptyDocument(),
      edit.addSection("projects", "Projects"),
    );

    expect(titles(next)).toEqual([
      "Summary",
      "Experience",
      "Education",
      "Skills",
      "Projects",
    ]);
  });

  it("inserts a section at a given index", () => {
    const next = apply(
      createEmptyDocument(),
      edit.addSection("projects", "Projects", 1),
    );

    expect(titles(next)[1]).toBe("Projects");
  });

  it("gives each added section a distinct id", () => {
    const next = apply(
      createEmptyDocument(),
      edit.addSection("custom", "One"),
      edit.addSection("custom", "Two"),
    );
    const ids = next.content.sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("removes a section", () => {
    const document = createEmptyDocument();
    const target = document.content.sections[1];

    const next = apply(document, edit.removeSection(target?.id ?? ""));

    expect(titles(next)).toEqual(["Summary", "Education", "Skills"]);
  });

  it("hides and unhides without deleting", () => {
    const document = createEmptyDocument();
    const id = document.content.sections[0]?.id ?? "";

    const hidden = apply(document, edit.setSectionHidden(id, true));
    expect(hidden.content.sections[0]?.hidden).toBe(true);

    const shown = apply(hidden, edit.setSectionHidden(id, false));
    expect("hidden" in (shown.content.sections[0] ?? {})).toBe(false);
    expect(shown.content.sections).toHaveLength(4);
  });

  it("moves a section", () => {
    const next = apply(createEmptyDocument(), edit.moveSection(0, 2));

    expect(titles(next)).toEqual([
      "Experience",
      "Education",
      "Summary",
      "Skills",
    ]);
  });

  it("clamps an out-of-range move instead of dropping the section", () => {
    const next = apply(createEmptyDocument(), edit.moveSection(0, 99));

    expect(next.content.sections).toHaveLength(4);
    expect(titles(next)[3]).toBe("Summary");
  });

  it("ignores a move from an index that does not exist", () => {
    const document = createEmptyDocument();
    const next = apply(document, edit.moveSection(99, 0));

    expect(titles(next)).toEqual(titles(document));
  });
});

describe("block edits", () => {
  const withParagraph = () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[0]?.id ?? "";

    return {
      sectionId,
      document: apply(
        document,
        edit.addBlock(sectionId, {
          id: "block-1",
          kind: "paragraph",
          text: text("Original"),
        }),
      ),
    };
  };

  it("sets, clamps and clears an image width", () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[0]?.id ?? "";
    const withImage = apply(
      document,
      edit.addBlock(sectionId, {
        id: "image-1",
        kind: "image",
        imageId: "row-1",
        alt: "",
      }),
    );

    const imageIn = (next: ResumeDocument) => {
      const block = next.content.sections
        .find((section) => section.id === sectionId)
        ?.blocks.find((candidate) => candidate.id === "image-1");

      return block?.kind === "image" ? block : undefined;
    };

    expect(imageIn(withImage)?.widthPercent).toBeUndefined();

    const half = apply(withImage, edit.setImageWidth(sectionId, "image-1", 50));
    expect(imageIn(half)?.widthPercent).toBe(50);

    // Clamped to the schema's own bounds, so no control can write a document
    // that fails validation on the way to disk.
    const clamped = apply(
      withImage,
      edit.setImageWidth(sectionId, "image-1", 400),
    );
    expect(imageIn(clamped)?.widthPercent).toBe(100);
    expect(documentSchema.safeParse(clamped).success).toBe(true);

    // Cleared by removing the key: a figure with no inline width is already
    // full width, so the default is absence rather than 100.
    const cleared = apply(
      half,
      edit.setImageWidth(sectionId, "image-1", undefined),
    );
    const block = imageIn(cleared);

    expect(block === undefined ? true : "widthPercent" in block).toBe(false);
  });

  it("leaves a block that is not an image alone", () => {
    const { document, sectionId } = withParagraph();
    const next = apply(document, edit.setImageWidth(sectionId, "block-1", 50));

    expect(next).toBe(document);
  });

  it("adds a block to a section", () => {
    const { document, sectionId } = withParagraph();
    const section = document.content.sections.find((s) => s.id === sectionId);

    expect(section?.blocks).toHaveLength(1);
  });

  it("ignores a block added to a section that does not exist", () => {
    const next = apply(
      createEmptyDocument(),
      edit.addBlock("nope", { id: "b", kind: "divider" }),
    );

    expect(
      next.content.sections.every((section) => section.blocks.length === 0),
    ).toBe(true);
  });

  it("duplicates a block right after itself, under a new id", () => {
    const { document, sectionId } = withParagraph();
    const next = apply(document, edit.duplicateBlock(sectionId, "block-1"));
    const blocks =
      next.content.sections.find((s) => s.id === sectionId)?.blocks ?? [];

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.id).toBe("block-1");
    expect(blocks[1]?.id).not.toBe("block-1");
    expect(blocks[1]).toMatchObject({
      kind: "paragraph",
      text: text("Original"),
    });
    expect(documentSchema.safeParse(next).success).toBe(true);
  });

  it("puts a duplicate in the middle, not at the end", () => {
    const { document, sectionId } = withParagraph();
    const three = apply(
      document,
      edit.addBlock(sectionId, { id: "block-2", kind: "divider" }),
      edit.duplicateBlock(sectionId, "block-1"),
    );
    const ids =
      three.content.sections
        .find((s) => s.id === sectionId)
        ?.blocks.map((block) => block.id) ?? [];

    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe("block-1");
    expect(ids[2]).toBe("block-2");
  });

  it("copies a block deeply, so editing one leaves the other alone", () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[0]?.id ?? "";
    const withEntry = apply(
      document,
      edit.addBlock(sectionId, {
        id: "entry-1",
        kind: "entry",
        title: text("Analyst"),
        bullets: [text("one"), text("two")],
      }),
      edit.duplicateBlock(sectionId, "entry-1"),
    );
    const copyId =
      withEntry.content.sections.find((s) => s.id === sectionId)?.blocks[1]
        ?.id ?? "";

    const edited = apply(
      withEntry,
      edit.setEntryBullet(sectionId, copyId, 0, text("changed")),
    );
    const blocks =
      edited.content.sections.find((s) => s.id === sectionId)?.blocks ?? [];
    const bullets = (index: number) => {
      const block = blocks[index];

      return block?.kind === "entry" ? block.bullets.map(plainText) : [];
    };

    expect(bullets(0)).toEqual(["one", "two"]);
    expect(bullets(1)).toEqual(["changed", "two"]);
  });

  it("does nothing to duplicate a block that is not there", () => {
    const { document, sectionId } = withParagraph();

    expect(apply(document, edit.duplicateBlock(sectionId, "nope"))).toBe(
      document,
    );
    expect(apply(document, edit.duplicateBlock("nope", "block-1"))).toBe(
      document,
    );
  });

  it("edits paragraph text", () => {
    const { document, sectionId } = withParagraph();

    const next = apply(
      document,
      edit.setBlockText(sectionId, "block-1", text("Edited")),
    );
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0];

    expect(block?.kind).toBe("paragraph");
    expect(block?.kind === "paragraph" && plainText(block.text)).toBe("Edited");
  });

  it("edits an entry title through the same operation", () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[1]?.id ?? "";
    const withEntry = apply(
      document,
      edit.addBlock(sectionId, {
        id: "entry-1",
        kind: "entry",
        title: text("Engineer"),
        bullets: [],
      }),
    );

    const next = apply(
      withEntry,
      edit.setBlockText(sectionId, "entry-1", text("Staff Engineer")),
    );
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0];

    expect(block?.kind === "entry" && plainText(block.title)).toBe(
      "Staff Engineer",
    );
  });

  it("leaves a raw block untouched, so unsupported Markdown round-trips", () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[0]?.id ?? "";
    const source = "| a | b |\n| - | - |";
    const withRaw = apply(
      document,
      edit.addBlock(sectionId, { id: "raw-1", kind: "raw", markdown: source }),
    );

    const next = apply(
      withRaw,
      edit.setBlockText(sectionId, "raw-1", text("clobbered")),
    );
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0];

    expect(block?.kind === "raw" && block.markdown).toBe(source);
  });

  it("edits one bullet without disturbing its siblings", () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[1]?.id ?? "";
    const withList = apply(
      document,
      edit.addBlock(sectionId, {
        id: "list-1",
        kind: "bulletList",
        items: [
          { text: text("One") },
          { text: text("Two") },
          { text: text("Three") },
        ],
      }),
    );

    const next = apply(
      withList,
      edit.setBulletItem(sectionId, "list-1", [1], text("Second")),
    );
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0];

    expect(
      block?.kind === "bulletList" &&
        block.items.map((item) => plainText(item.text)),
    ).toEqual(["One", "Second", "Three"]);
  });

  it("ignores a bullet index that is out of range", () => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[1]?.id ?? "";
    const withList = apply(
      document,
      edit.addBlock(sectionId, {
        id: "list-1",
        kind: "bulletList",
        items: [{ text: text("One") }],
      }),
    );

    const next = apply(
      withList,
      edit.setBulletItem(sectionId, "list-1", [5], text("Nope")),
    );
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0];

    expect(block?.kind === "bulletList" && block.items).toHaveLength(1);
  });

  it("removes a block", () => {
    const { document, sectionId } = withParagraph();

    const next = apply(document, edit.removeBlock(sectionId, "block-1"));

    expect(
      next.content.sections.find((s) => s.id === sectionId)?.blocks,
    ).toEqual([]);
  });

  it("moves a block across sections in one step", () => {
    const document = createEmptyDocument();
    const from = document.content.sections[0]?.id ?? "";
    const to = document.content.sections[1]?.id ?? "";
    const seeded = apply(
      document,
      edit.addBlock(from, { id: "block-1", kind: "divider" }),
    );

    const next = apply(seeded, edit.moveBlockToSection(from, "block-1", to, 0));

    expect(next.content.sections.find((s) => s.id === from)?.blocks).toEqual(
      [],
    );
    expect(
      next.content.sections.find((s) => s.id === to)?.blocks.map((b) => b.id),
    ).toEqual(["block-1"]);
  });

  it("ignores a cross-section move of a block that is not there", () => {
    const document = createEmptyDocument();
    const from = document.content.sections[0]?.id ?? "";
    const to = document.content.sections[1]?.id ?? "";

    const next = apply(document, edit.moveBlockToSection(from, "ghost", to, 0));

    expect(next).toBe(document);
  });
});

describe("parts inside a block", () => {
  const setup = (block: Block) => {
    const document = createEmptyDocument();
    const sectionId = document.content.sections[0]?.id ?? "";

    return {
      sectionId,
      document: apply(document, edit.addBlock(sectionId, block)),
    };
  };

  const blockIn = (document: ResumeDocument, sectionId: string) =>
    document.content.sections.find((s) => s.id === sectionId)?.blocks[0];

  const entry = (...bullets: Array<string>): Block => ({
    id: "e",
    kind: "entry",
    title: text("Analyst"),
    bullets: bullets.map(text),
  });

  const bulletsOf = (document: ResumeDocument, sectionId: string) => {
    const block = blockIn(document, sectionId);

    return block?.kind === "entry" ? block.bullets.map(plainText) : [];
  };

  describe("entry bullets", () => {
    it("adds an empty one where it is told", () => {
      const { document, sectionId } = setup(entry("a", "b"));
      const next = apply(document, edit.addEntryBullet(sectionId, "e", 1));

      expect(bulletsOf(next, sectionId)).toEqual(["a", "", "b"]);
      expect(documentSchema.safeParse(next).success).toBe(true);
    });

    it("stores a bullet and adds the next as one recipe", () => {
      const { document, sectionId } = setup(entry("a"));
      const next = apply(document, (draft) => {
        edit.setEntryBullet(sectionId, "e", 0, text("kept"))(draft);
        edit.addEntryBullet(sectionId, "e", 1)(draft);
      });

      expect(bulletsOf(next, sectionId)).toEqual(["kept", ""]);
    });

    it("removes one", () => {
      const { document, sectionId } = setup(entry("a", "b", "c"));
      const next = apply(document, edit.removeEntryBullet(sectionId, "e", 1));

      expect(bulletsOf(next, sectionId)).toEqual(["a", "c"]);
    });

    it("moves one", () => {
      const { document, sectionId } = setup(entry("a", "b", "c"));
      const next = apply(document, edit.moveEntryBullet(sectionId, "e", 2, 0));

      expect(bulletsOf(next, sectionId)).toEqual(["c", "a", "b"]);
    });

    it("ignores an index that is not there, and a block that is not an entry", () => {
      const { document, sectionId } = setup(entry("a"));

      expect(apply(document, edit.addEntryBullet(sectionId, "e", 5))).toBe(
        document,
      );
      expect(apply(document, edit.removeEntryBullet(sectionId, "e", 3))).toBe(
        document,
      );
      expect(apply(document, edit.addEntryBullet(sectionId, "nope", 0))).toBe(
        document,
      );

      const { document: other, sectionId: otherSection } = setup({
        id: "e",
        kind: "divider",
      });

      expect(apply(other, edit.addEntryBullet(otherSection, "e", 0))).toBe(
        other,
      );
    });
  });

  describe("list items", () => {
    const list = (): Block => ({
      id: "l",
      kind: "bulletList",
      items: [
        { text: text("one") },
        {
          text: text("two"),
          list: { items: [{ text: text("two-a") }, { text: text("two-b") }] },
        },
        { text: text("three") },
      ],
    });

    const itemsOf = (document: ResumeDocument, sectionId: string) => {
      const block = blockIn(document, sectionId);

      return block?.kind === "bulletList"
        ? block.items.map((item) => ({
            text: plainText(item.text),
            nested: item.list?.items.map((child) => plainText(child.text)),
          }))
        : [];
    };

    it("adds an empty item at a top-level position", () => {
      const { document, sectionId } = setup(list());
      const next = apply(document, edit.addBulletItem(sectionId, "l", [1]));

      expect(itemsOf(next, sectionId).map((item) => item.text)).toEqual([
        "one",
        "",
        "two",
        "three",
      ]);
      expect(documentSchema.safeParse(next).success).toBe(true);
    });

    it("adds into a nested list by path", () => {
      const { document, sectionId } = setup(list());
      const next = apply(document, edit.addBulletItem(sectionId, "l", [1, 1]));

      expect(itemsOf(next, sectionId)[1]?.nested).toEqual([
        "two-a",
        "",
        "two-b",
      ]);
    });

    it("makes the next item of a checklist a checkbox too", () => {
      const { document, sectionId } = setup({
        id: "l",
        kind: "bulletList",
        items: [{ text: text("task"), checked: true }],
      });
      const next = apply(document, edit.addBulletItem(sectionId, "l", [1]));
      const block = blockIn(next, sectionId);

      expect(block?.kind === "bulletList" && block.items[1]?.checked).toBe(
        false,
      );
    });

    it("removes an item with what was nested under it", () => {
      const { document, sectionId } = setup(list());
      const next = apply(document, edit.removeBulletItem(sectionId, "l", [1]));

      expect(itemsOf(next, sectionId).map((item) => item.text)).toEqual([
        "one",
        "three",
      ]);
    });

    it("drops a nested list that has had its last item removed", () => {
      const { document, sectionId } = setup(list());
      const next = apply(
        document,
        edit.removeBulletItem(sectionId, "l", [1, 0]),
        edit.removeBulletItem(sectionId, "l", [1, 0]),
      );

      expect(itemsOf(next, sectionId)[1]?.nested).toBeUndefined();
      expect(documentSchema.safeParse(next).success).toBe(true);
    });

    it("moves an item among its siblings and never changes its depth", () => {
      const { document, sectionId } = setup(list());
      const down = apply(document, edit.moveBulletItem(sectionId, "l", [0], 1));

      expect(itemsOf(down, sectionId).map((item) => item.text)).toEqual([
        "two",
        "one",
        "three",
      ]);

      const nested = apply(
        document,
        edit.moveBulletItem(sectionId, "l", [1, 0], 1),
      );

      expect(itemsOf(nested, sectionId)[1]?.nested).toEqual(["two-b", "two-a"]);
    });

    it("ignores a path that leads nowhere", () => {
      const { document, sectionId } = setup(list());

      expect(apply(document, edit.addBulletItem(sectionId, "l", [9, 0]))).toBe(
        document,
      );
      expect(
        apply(document, edit.removeBulletItem(sectionId, "l", [0, 4])),
      ).toBe(document);
      expect(apply(document, edit.addBulletItem(sectionId, "l", []))).toBe(
        document,
      );
    });
  });

  describe("tags", () => {
    const tags = (): Block => ({ id: "t", kind: "tagList", tags: ["a", "b"] });

    it("adds a blank one, which setTag then removes if it stays blank", () => {
      const { document, sectionId } = setup(tags());
      const added = apply(document, edit.addTag(sectionId, "t", 1));
      const block = blockIn(added, sectionId);

      expect(block?.kind === "tagList" && block.tags).toEqual(["a", "", "b"]);

      const cleared = apply(added, edit.setTag(sectionId, "t", 1, "  "));
      const after = blockIn(cleared, sectionId);

      expect(after?.kind === "tagList" && after.tags).toEqual(["a", "b"]);
    });

    it("ignores a position past the end", () => {
      const { document, sectionId } = setup(tags());

      expect(apply(document, edit.addTag(sectionId, "t", 9))).toBe(document);
    });
  });
});

describe("style and template edits", () => {
  it("patches one style group without resetting the others", () => {
    const document = createEmptyDocument();

    const next = apply(document, edit.patchDesign({ paper: { size: "A4" } }));

    expect(next.design.paper.size).toBe("A4");
    // The rest of the paper group, and every other group, is preserved.
    expect(next.design.paper.margin).toEqual(document.design.paper.margin);
    expect(next.design.typography).toEqual(document.design.typography);
  });

  it("keeps the document valid after a style patch", () => {
    const next = apply(
      createEmptyDocument(),
      edit.patchDesign({ typography: { baseSize: 11 } }),
    );

    expect(documentSchema.safeParse(next).success).toBe(true);
  });

  it("switches template while preserving customised styling", () => {
    const customised = apply(
      createEmptyDocument(),
      edit.patchDesign({ paper: { size: "A4" } }),
    );

    const next = apply(
      customised,
      edit.setTemplate("technical", { resetDesign: false }),
    );

    expect(next.templateId).toBe("technical");
    expect(next.design.paper.size).toBe("A4");
  });

  it("reseeds styling from the template when asked to", () => {
    const customised = apply(
      createEmptyDocument(),
      edit.patchDesign({ paper: { size: "A4" } }),
    );

    const next = apply(
      customised,
      edit.setTemplate("technical", { resetDesign: true }),
    );

    expect(next.design).toEqual(templateDefaults("technical"));
  });

  it("stores custom CSS verbatim", () => {
    const css = ".resume h2 { letter-spacing: 0.04em; }";
    const next = apply(createEmptyDocument(), edit.setCustomCss(css));

    expect(next.customCss).toBe(css);
  });
});
