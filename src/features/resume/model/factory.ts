import { createId } from "@/lib/id";
import { templateDefaults } from "@/features/templates/defaults";

import { DOCUMENT_VERSION } from "./document";
import { sectionTitle } from "./sectionTitles";

import type {
  Block,
  ContactItem,
  DocumentKind,
  IconRef,
  InlineText,
  ResumeDocument,
  Section,
  SectionKind,
  TemplateId,
} from "./document";

/**
 * Constructors for document nodes.
 *
 * Everything that creates a node goes through here, so ids are never forgotten
 * and new documents always carry the current `schemaVersion`.
 */

/** Plain unformatted text. The common case by far. */
export const text = (value: string): InlineText =>
  value === "" ? [] : [{ type: "text", text: value }];

/** Reads the plain string back out, dropping formatting. Used for search,
 * denormalized metadata and Markdown serialization of simple runs. */
export const plainText = (inline: InlineText): string =>
  inline
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text;
        case "link":
          return plainText(node.children);
        case "icon":
          return "";
      }
    })
    .join("");

const icon = (name: string): IconRef => ({ library: "phosphor", name });

export const createContact = (
  label: string,
  options: { icon?: string; href?: string } = {},
): ContactItem => ({
  id: createId(),
  label: text(label),
  ...(options.icon === undefined ? {} : { icon: icon(options.icon) }),
  ...(options.href === undefined ? {} : { href: options.href }),
});

/**
 * The kinds of block the paper offers to insert.
 *
 * Not every kind. The ones left out cannot be filled in from the paper yet, and
 * an empty block of them is a dead end: an image needs an asset to point at, a
 * tag list draws nothing until it has a tag and the paper has no way to add one,
 * a code block and a table have no editable field there, and `raw` is only ever
 * what the parser could not read. Add a kind here when the paper can edit it.
 */
export const INSERTABLE_BLOCK_KINDS = [
  "paragraph",
  "heading",
  "bulletList",
  "entry",
  "quote",
  "divider",
  "pageBreak",
] as const;

export type InsertableBlockKind = (typeof INSERTABLE_BLOCK_KINDS)[number];

/**
 * An empty block of `kind`, with a fresh id.
 *
 * Empty in the sense of "nothing the owner did not write", never a sample line.
 * The one thing it does carry is a single empty run where a kind has a list of
 * them (a bullet, a paragraph of a quote): a list with no items draws nothing,
 * so there would be no field on the paper to click, and the block would be
 * there and unreachable. The shapes are what the Markdown codec reads an empty
 * one of each as, so the document and its Markdown agree.
 */
export const createBlock = (kind: InsertableBlockKind): Block => {
  const id = createId();

  switch (kind) {
    case "paragraph":
      return { id, kind, text: [] };
    case "heading":
      return { id, kind, level: 3, text: [] };
    case "bulletList":
      return { id, kind, items: [{ text: [] }] };
    case "entry":
      return { id, kind, title: [], bullets: [[]] };
    case "quote":
      return { id, kind, paragraphs: [[]] };
    case "divider":
      return { id, kind };
    case "pageBreak":
      return { id, kind };
  }
};

export const createSection = (
  kind: SectionKind,
  title: string,
  blocks: Section["blocks"] = [],
): Section => ({
  id: createId(),
  kind,
  title: text(title),
  blocks,
});

/**
 * A new, empty resume.
 *
 * Starts with the four sections almost every resume has, each empty, rather
 * than a blank page: an empty section is a visible affordance ("add an entry"),
 * whereas a blank document gives the user nothing to click.
 *
 * Nothing is written into it. A document should never contain text its owner
 * did not write, so the example resume in `features/resume/sample.ts` is
 * something the new-resume dialog offers and this is what it offers instead.
 *
 * The four headings are the one exception, and they are the document's own
 * words: in the language the resume is written in, which the caller says. A
 * resume started by someone using the app in Indonesian is not handed a
 * "Summary" to retitle in every one of its sections.
 */
export const createEmptyDocument = (
  templateId: TemplateId = "classic",
  locale = "en",
  kind: DocumentKind = "resume",
): ResumeDocument => ({
  schemaVersion: DOCUMENT_VERSION,
  // Written only for a letter, so a resume is byte for byte what it was before
  // the field existed.
  ...(kind === "coverLetter" ? { kind } : {}),
  templateId,
  meta: { fullName: "", locale },
  content: {
    header: {
      name: [],
      contacts: [],
    },
    sections:
      kind === "coverLetter"
        ? // One section with no title: a letter is a run of paragraphs, and the
          // flow draws no heading for it. The title is empty and not hidden
          // because the Markdown writes a bare `##` for it, which reads back as
          // the same section.
          [createSection("custom", "")]
        : [
            createSection("summary", sectionTitle("summary", locale)),
            createSection("experience", sectionTitle("experience", locale)),
            createSection("education", sectionTitle("education", locale)),
            createSection("skills", sectionTitle("skills", locale)),
          ],
  },
  design: templateDefaults(templateId, kind),
  customCss: "",
});

/**
 * Recomputes the denormalized `meta` fields from `content.header`.
 *
 * `meta` exists so the resume list can search and sort without parsing every
 * document, which means it has to be refreshed whenever the header changes.
 * Call this on save rather than on every keystroke.
 */
export const syncMeta = (document: ResumeDocument): ResumeDocument => {
  const fullName = plainText(document.content.header.name);
  const headline =
    document.content.header.headline === undefined
      ? undefined
      : plainText(document.content.header.headline);

  return {
    ...document,
    meta: {
      ...document.meta,
      fullName,
      ...(headline === undefined || headline === "" ? {} : { headline }),
    },
  };
};
