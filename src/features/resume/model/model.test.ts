import { describe, expect, it } from "vitest";

import { templateDefaults } from "@/features/templates/defaults";

import {
  DOCUMENT_VERSION,
  TEMPLATE_IDS,
  createEmptyDocument,
  createSection,
  plainText,
  syncMeta,
  text,
} from "./index";
import { documentSchema } from "./schema";

import type { InlineText } from "./document";

describe("inline text", () => {
  it("represents empty input as an empty run, not a run of empty text", () => {
    expect(text("")).toEqual([]);
  });

  it("round-trips plain strings", () => {
    expect(plainText(text("Avery Chen"))).toBe("Avery Chen");
  });

  it("flattens marks and nested links when reading plain text", () => {
    const inline: InlineText = [
      { type: "text", text: "Staff ", marks: ["bold"] },
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", text: "Engineer" }],
      },
    ];

    expect(plainText(inline)).toBe("Staff Engineer");
  });

  it("contributes no characters for icons", () => {
    const inline: InlineText = [
      { type: "icon", icon: { library: "phosphor", name: "envelope-simple" } },
      { type: "text", text: "a@example.com" },
    ];

    expect(plainText(inline)).toBe("a@example.com");
  });
});

describe("createEmptyDocument", () => {
  it("stamps the current schema version", () => {
    expect(createEmptyDocument().schemaVersion).toBe(DOCUMENT_VERSION);
  });

  it("starts with empty prompting sections rather than a blank page", () => {
    const document = createEmptyDocument();

    expect(document.content.sections.map((section) => section.kind)).toEqual([
      "summary",
      "experience",
      "education",
      "skills",
    ]);
    expect(
      document.content.sections.every((section) => section.blocks.length === 0),
    ).toBe(true);
  });

  it("inserts no sample content into the user document", () => {
    const document = createEmptyDocument();

    expect(plainText(document.content.header.name)).toBe("");
    expect(document.content.header.contacts).toEqual([]);
    expect(document.customCss).toBe("");
  });

  it("gives every node a distinct id", () => {
    const document = createEmptyDocument();
    const ids = document.content.sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it("does not share design objects between documents", () => {
    const a = createEmptyDocument();
    const b = createEmptyDocument();

    a.design.paper.margin.top = 1.25;

    expect(b.design.paper.margin.top).toBe(0.6);
  });

  it.each(TEMPLATE_IDS)("seeds design tokens for %s", (templateId) => {
    const document = createEmptyDocument(templateId);

    expect(document.templateId).toBe(templateId);
    expect(document.design).toEqual(templateDefaults(templateId));
  });
});

describe("syncMeta", () => {
  it("denormalizes the header into searchable metadata", () => {
    const document = createEmptyDocument();
    document.content.header.name = text("Avery Chen");
    document.content.header.headline = text("Staff Engineer");

    const synced = syncMeta(document);

    expect(synced.meta.fullName).toBe("Avery Chen");
    expect(synced.meta.headline).toBe("Staff Engineer");
  });

  it("omits an empty headline instead of storing a blank string", () => {
    const document = createEmptyDocument();
    document.content.header.headline = text("");

    expect(syncMeta(document).meta.headline).toBeUndefined();
  });

  it("leaves the source document untouched", () => {
    const document = createEmptyDocument();
    document.content.header.name = text("Avery Chen");

    syncMeta(document);

    expect(document.meta.fullName).toBe("");
  });
});

describe("documentSchema", () => {
  it("accepts a freshly created document", () => {
    expect(documentSchema.safeParse(createEmptyDocument()).success).toBe(true);
  });

  it.each(TEMPLATE_IDS)("accepts a %s document", (templateId) => {
    expect(
      documentSchema.safeParse(createEmptyDocument(templateId)).success,
    ).toBe(true);
  });

  it("accepts every block kind", () => {
    const document = createEmptyDocument();
    document.content.sections = [
      createSection("custom", "Everything", [
        { id: "b1", kind: "paragraph", text: text("Hello") },
        {
          id: "b2",
          kind: "bulletList",
          items: [{ text: text("One") }, { text: text("Two") }],
        },
        {
          id: "b3",
          kind: "entry",
          title: text("Staff Engineer"),
          subtitle: text("Acme"),
          location: text("Remote"),
          dateRange: { start: "2024-01", current: true },
          summary: text("Led platform work."),
          bullets: [text("Shipped the thing")],
        },
        { id: "b4", kind: "tagList", tags: ["TypeScript", "React"] },
        { id: "b5", kind: "image", imageId: "img-1", alt: "Portrait" },
        { id: "b6", kind: "divider" },
        {
          id: "b7",
          kind: "iconLabel",
          icon: { library: "phosphor", name: "map-pin" },
          label: text("Jakarta"),
        },
        { id: "b8", kind: "raw", markdown: "| a | b |\n| - | - |" },
      ]),
    ];

    const result = documentSchema.safeParse(document);

    expect(result.success).toBe(true);
  });

  it("rejects an unknown template", () => {
    const document = { ...createEmptyDocument(), templateId: "brutalist" };

    expect(documentSchema.safeParse(document).success).toBe(false);
  });

  it("rejects a document written by a newer build", () => {
    const document = {
      ...createEmptyDocument(),
      schemaVersion: DOCUMENT_VERSION + 1,
    };

    const result = documentSchema.safeParse(document);

    expect(result.success).toBe(false);
  });

  it("rejects a colour that could break out of its CSS declaration", () => {
    const document = createEmptyDocument();
    document.design.colors.accent = "red; } body { display: none";

    expect(documentSchema.safeParse(document).success).toBe(false);
  });

  it("rejects a colour that fetches an external resource", () => {
    const document = createEmptyDocument();
    document.design.colors.accent = "url(https://example.com/track.png)";

    expect(documentSchema.safeParse(document).success).toBe(false);
  });

  it("rejects a custom font that names no font row", () => {
    const document = createEmptyDocument();
    document.design.typography.bodyFont = {
      family: "Uploaded Sans",
      source: "custom",
    };

    const result = documentSchema.safeParse(document);

    expect(result.success).toBe(false);
  });

  it("accepts a custom font that names a font row", () => {
    const document = createEmptyDocument();
    document.design.typography.bodyFont = {
      family: "Uploaded Sans",
      source: "custom",
      fontId: "font-1",
    };

    expect(documentSchema.safeParse(document).success).toBe(true);
  });

  it("rejects a Phosphor icon name that is not kebab-case", () => {
    const document = createEmptyDocument();
    document.content.sections[0]!.icon = {
      library: "phosphor",
      name: "EnvelopeSimple",
    };

    expect(documentSchema.safeParse(document).success).toBe(false);
  });

  it("reports the path of the offending field", () => {
    const base = createEmptyDocument();
    const document: unknown = {
      ...base,
      design: {
        ...base.design,
        paper: { ...base.design.paper, size: "Legal" },
      },
    };

    const result = documentSchema.safeParse(document);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["design", "paper", "size"]);
    }
  });
});
