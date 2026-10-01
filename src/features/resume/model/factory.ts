import { createId } from "@/lib/id";
import { templateDefaults } from "@/features/templates/defaults";

import { DOCUMENT_VERSION } from "./document";
import { sectionTitle } from "./sectionTitles";

import type {
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
