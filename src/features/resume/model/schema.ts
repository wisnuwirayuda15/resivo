import { z } from "zod";

import {
  DOCUMENT_VERSION,
  ICON_WEIGHTS,
  MARKS,
  PAPER_SIZES,
  SECTION_KINDS,
  DOCUMENT_KINDS,
  TAG_SEPARATOR_MAX,
  TEMPLATE_IDS,
  TEXT_ALIGNMENTS,
} from "./document";

import type {
  Block,
  DesignConfig,
  InlineNode,
  ListItem,
  ResumeDocument,
  Section,
} from "./document";

/**
 * Runtime mirror of the document model.
 *
 * Every document that enters the app from outside (a JSON backup, an imported
 * file, a record written by an older build) is parsed through this before it is
 * trusted. In-memory edits are already type-checked, so the hot editing path
 * does not validate.
 *
 * The schemas are kept structurally identical to the interfaces in
 * `document.ts`; the `satisfies` assertions at the bottom fail the build if the
 * two ever drift.
 */

/**
 * A CSS colour supplied by the user. These values are interpolated into CSS
 * custom properties, so the characters that would let a value break out of its
 * declaration are rejected outright rather than escaped.
 */
const cssColor = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => !/[;{}<>\\]/.test(value), {
    message: "Colour may not contain ; { } < > or backslash",
  })
  .refine((value) => !/url\s*\(|@import|expression\s*\(/i.test(value), {
    message: "Colour may not reference external resources",
  });

/** Stable node identity. Generated with `crypto.randomUUID`, but any non-empty
 * opaque string is accepted so imported documents keep their own ids. */
const id = z.string().min(1).max(128);

const iconRefSchema = z.object({
  library: z.literal("phosphor"),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Phosphor icon names are lowercase and kebab-case"),
  weight: z.enum(ICON_WEIGHTS).optional(),
});

// `link` nests inline nodes, so the union has to be lazy.
const inlineNodeSchema: z.ZodType<InlineNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("text"),
      text: z.string(),
      marks: z.array(z.enum(MARKS)).optional(),
    }),
    z.object({
      type: z.literal("link"),
      href: z.string().max(2048),
      children: z.array(inlineNodeSchema),
    }),
    z.object({ type: z.literal("icon"), icon: iconRefSchema }),
  ]),
);

const inlineTextSchema = z.array(inlineNodeSchema);

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const dateRangeSchema = z.object({
  start: z.string().max(64).optional(),
  end: z.string().max(64).optional(),
  current: z.boolean().optional(),
});

/**
 * A list item nests a whole list, so like `link` this has to be lazy. The depth
 * is bounded by the Markdown parser rather than here, mdast will not produce a
 * list deeper than the source is indented.
 */
const listItemSchema: z.ZodType<ListItem> = z.lazy(() =>
  z.object({
    text: inlineTextSchema,
    checked: z.boolean().optional(),
    list: z
      .object({
        ordered: z.boolean().optional(),
        start: z.number().int().min(0).max(1_000_000).optional(),
        items: z.array(listItemSchema),
      })
      .optional(),
  }),
);

const blockSchema = z.discriminatedUnion("kind", [
  z.object({ id, kind: z.literal("paragraph"), text: inlineTextSchema }),
  z.object({
    id,
    kind: z.literal("heading"),
    level: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    text: inlineTextSchema,
  }),
  z.object({
    id,
    kind: z.literal("bulletList"),
    ordered: z.boolean().optional(),
    start: z.number().int().min(0).max(1_000_000).optional(),
    items: z.array(listItemSchema),
  }),
  z.object({
    id,
    kind: z.literal("quote"),
    paragraphs: z.array(inlineTextSchema),
  }),
  z.object({
    id,
    kind: z.literal("code"),
    language: z.string().max(64).optional(),
    code: z.string(),
  }),
  z.object({
    id,
    kind: z.literal("table"),
    head: z.array(inlineTextSchema),
    rows: z.array(z.array(inlineTextSchema)),
    align: z.array(z.enum(["left", "center", "right"]).nullable()),
  }),
  z.object({
    id,
    kind: z.literal("entry"),
    title: inlineTextSchema,
    subtitle: inlineTextSchema.optional(),
    location: inlineTextSchema.optional(),
    dateRange: dateRangeSchema.optional(),
    summary: inlineTextSchema.optional(),
    bullets: z.array(inlineTextSchema),
  }),
  z.object({
    id,
    kind: z.literal("tagList"),
    tags: z.array(z.string().max(128)),
  }),
  z.object({
    id,
    kind: z.literal("image"),
    imageId: id,
    alt: z.string().max(512),
    widthPercent: z.number().min(1).max(100).optional(),
  }),
  z.object({ id, kind: z.literal("divider") }),
  z.object({ id, kind: z.literal("pageBreak") }),
  z.object({
    id,
    kind: z.literal("iconLabel"),
    icon: iconRefSchema,
    label: inlineTextSchema,
  }),
  z.object({ id, kind: z.literal("raw"), markdown: z.string() }),
]);

// ---------------------------------------------------------------------------
// Sections + content
// ---------------------------------------------------------------------------

const sectionSchema = z.object({
  id,
  kind: z.enum(SECTION_KINDS),
  title: inlineTextSchema,
  icon: iconRefSchema.optional(),
  hidden: z.boolean().optional(),
  blocks: z.array(blockSchema),
  style: z
    .object({
      spaceBefore: z.number().min(0).max(20).optional(),
      showDivider: z.boolean().optional(),
      columns: z.union([z.literal(1), z.literal(2)]).optional(),
      breakBefore: z.enum(["auto", "page"]).optional(),
    })
    .optional(),
});

const contactItemSchema = z.object({
  id,
  icon: iconRefSchema.optional(),
  label: inlineTextSchema,
  href: z.string().max(2048).optional(),
});

const headerSchema = z.object({
  name: inlineTextSchema,
  headline: inlineTextSchema.optional(),
  contacts: z.array(contactItemSchema),
  avatarImageId: id.optional(),
});

const contentSchema = z.object({
  header: headerSchema,
  sections: z.array(sectionSchema),
});

// ---------------------------------------------------------------------------
// Design configuration
// ---------------------------------------------------------------------------

const boxEdgesSchema = z.object({
  top: z.number().min(0).max(4),
  right: z.number().min(0).max(4),
  bottom: z.number().min(0).max(4),
  left: z.number().min(0).max(4),
});

const fontRefSchema = z
  .object({
    family: z.string().min(1).max(128),
    source: z.enum(["builtin", "custom"]),
    fontId: id.optional(),
  })
  .refine((font) => font.source !== "custom" || font.fontId !== undefined, {
    message: "A custom font must reference a row in the fonts table",
    path: ["fontId"],
  });

const designConfigSchema = z.object({
  paper: z.object({
    size: z.enum(PAPER_SIZES),
    margin: boxEdgesSchema,
  }),
  typography: z.object({
    bodyFont: fontRefSchema,
    headingFont: fontRefSchema.optional(),
    baseSize: z.number().min(6).max(24),
    scale: z.number().min(1).max(2),
    lineHeight: z.number().min(1).max(3),
    weights: z.object({
      body: z.number().int().min(100).max(900),
      heading: z.number().int().min(100).max(900),
    }),
  }),
  colors: z.object({
    text: cssColor,
    heading: cssColor,
    accent: cssColor,
    muted: cssColor,
    rule: cssColor,
  }),
  spacing: z.object({
    section: z.number().min(0).max(10),
    paragraph: z.number().min(0).max(10),
    heading: z.number().min(0).max(10),
  }),
  rules: z.object({
    showDividers: z.boolean(),
    width: z.number().min(0).max(8),
    color: cssColor,
  }),
  image: z.object({
    avatarShape: z.enum(["circle", "square", "rounded"]),
    avatarSize: z.number().min(16).max(512),
  }),
  icons: z.object({
    size: z.number().min(6).max(64),
    color: cssColor,
    defaultWeight: z.enum(ICON_WEIGHTS),
  }),
  // Optional for the same reason as `pagination` below.
  text: z
    .object({
      align: z.enum(TEXT_ALIGNMENTS).optional(),
      tagSeparator: z.string().max(TAG_SEPARATOR_MAX).optional(),
    })
    .optional(),
  // Optional, so a document written before pagination had settings still
  // validates. Its absence means the defaults.
  pagination: z
    .object({ keepHeadingWithContent: z.boolean().optional() })
    .optional(),
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const metaSchema = z.object({
  fullName: z.string().max(256),
  headline: z.string().max(512).optional(),
  locale: z.string().min(2).max(35),
});

export const documentSchema = z.object({
  /**
   * Not pinned to `DOCUMENT_VERSION`: older documents are valid input and are
   * migrated on read. Anything newer than this build is rejected by the caller,
   * which can explain the version mismatch rather than guessing at the shape.
   */
  schemaVersion: z.number().int().min(1).max(DOCUMENT_VERSION),
  kind: z.enum(DOCUMENT_KINDS).optional(),
  templateId: z.enum(TEMPLATE_IDS),
  meta: metaSchema,
  content: contentSchema,
  design: designConfigSchema,
  customCss: z.string().max(200_000),
});

export const blockSchemaForTest = blockSchema;
export const sectionSchemaForTest = sectionSchema;
export const designConfigSchemaForTest = designConfigSchema;

/**
 * Compile-time guards that the runtime schemas still describe the interfaces.
 * If a field is added to `document.ts` without being added here, one of these
 * lines stops type-checking.
 */
export type ParsedDocument = z.infer<typeof documentSchema>;
const _documentMatches = {} as ParsedDocument satisfies ResumeDocument;
const _blockMatches = {} as z.infer<typeof blockSchema> satisfies Block;
const _sectionMatches = {} as z.infer<typeof sectionSchema> satisfies Section;
const _designMatches = {} as z.infer<
  typeof designConfigSchema
> satisfies DesignConfig;
void _documentMatches;
void _blockMatches;
void _sectionMatches;
void _designMatches;
