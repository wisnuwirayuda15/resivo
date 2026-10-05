import { createId } from "@/lib/id";
import { createSection, text } from "@/features/resume/model/index";
import { templateDefaults } from "@/features/templates/defaults";

import type { Draft } from "immer";
import type {
  Block,
  DateRange,
  DesignConfig,
  IconRef,
  InlineText,
  ListItem,
  ResumeDocument,
  Section,
  SectionKind,
  TemplateId,
} from "@/features/resume/model/document";

/**
 * Typed edits to the document.
 *
 * Every editing surface (the visual editor, the style panel, the template
 * picker, the Markdown codec) funnels through these rather than mutating the
 * document directly. That is what keeps a single undo history meaningful: one
 * call here is one user-visible change, whatever produced it.
 *
 * Each function is an Immer recipe operating on a draft, so the store gets
 * structural sharing for free and snapshots stay cheap.
 */

export type Recipe = (draft: Draft<ResumeDocument>) => void;

const findSection = (
  draft: Draft<ResumeDocument>,
  sectionId: string,
): Draft<Section> | undefined =>
  draft.content.sections.find((section) => section.id === sectionId);

/** Moves an item within an array, clamping the destination. Shared by section
 * and block reordering so both behave identically at the boundaries. */
const moveWithin = <T>(items: Array<T>, from: number, to: number): void => {
  if (from < 0 || from >= items.length) {
    return;
  }

  const clamped = Math.max(0, Math.min(to, items.length - 1));
  const [moved] = items.splice(from, 1);

  if (moved !== undefined) {
    items.splice(clamped, 0, moved);
  }
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

/**
 * The document's language tag.
 *
 * Affects date formatting and the exported `<html lang>`, not the text of the
 * resume, the model has always carried it and nothing could change it, so every
 * document was permanently `en` and every date range could only ever render in
 * English.
 */
export const setLocale =
  (locale: string): Recipe =>
  (draft) => {
    const trimmed = locale.trim();

    if (trimmed.length >= 2) {
      draft.meta.locale = trimmed;
    }
  };

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export const setHeaderName =
  (name: InlineText): Recipe =>
  (draft) => {
    draft.content.header.name = name;
  };

export const setHeaderHeadline =
  (headline: InlineText): Recipe =>
  (draft) => {
    draft.content.header.headline = headline;
  };

export const setAvatarImage =
  (imageId: string | undefined): Recipe =>
  (draft) => {
    if (imageId === undefined) {
      delete draft.content.header.avatarImageId;
    } else {
      draft.content.header.avatarImageId = imageId;
    }
  };

export const addContact =
  (label = ""): Recipe =>
  (draft) => {
    draft.content.header.contacts.push({ id: createId(), label: text(label) });
  };

export const updateContactLabel =
  (contactId: string, label: InlineText): Recipe =>
  (draft) => {
    const contact = draft.content.header.contacts.find(
      (item) => item.id === contactId,
    );

    if (contact !== undefined) {
      contact.label = label;
    }
  };

/**
 * The icon beside a contact.
 *
 * The renderer has drawn `contact.icon` since it was written, and no recipe set
 * it, so the field could only arrive through a Markdown directive.
 */
export const setContactIcon =
  (contactId: string, icon: IconRef | undefined): Recipe =>
  (draft) => {
    const contact = draft.content.header.contacts.find(
      (item) => item.id === contactId,
    );

    if (contact === undefined) {
      return;
    }

    if (icon === undefined) {
      delete contact.icon;
    } else {
      contact.icon = icon;
    }
  };

/** Makes a contact a link, or stops it being one. An empty string clears it,
 * since that is what an emptied input produces. */
export const setContactHref =
  (contactId: string, href: string): Recipe =>
  (draft) => {
    const contact = draft.content.header.contacts.find(
      (item) => item.id === contactId,
    );

    if (contact === undefined) {
      return;
    }

    const trimmed = href.trim();

    if (trimmed === "") {
      delete contact.href;
    } else {
      contact.href = trimmed;
    }
  };

export const removeContact =
  (contactId: string): Recipe =>
  (draft) => {
    // Splice rather than reassign a filtered array: reassigning would hand Immer
    // a new array even when nothing matched, which would cost the user an undo
    // step for an edit that changed nothing.
    const index = draft.content.header.contacts.findIndex(
      (contact) => contact.id === contactId,
    );

    if (index !== -1) {
      draft.content.header.contacts.splice(index, 1);
    }
  };

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const addSection =
  (kind: SectionKind, title: string, atIndex?: number): Recipe =>
  (draft) => {
    const section = createSection(kind, title);
    const index = atIndex ?? draft.content.sections.length;

    draft.content.sections.splice(index, 0, section);
  };

export const removeSection =
  (sectionId: string): Recipe =>
  (draft) => {
    const index = draft.content.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (index !== -1) {
      draft.content.sections.splice(index, 1);
    }
  };

export const setSectionTitle =
  (sectionId: string, title: InlineText): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section !== undefined) {
      section.title = title;
    }
  };

/**
 * Hides a section instead of deleting it.
 *
 * Distinct from removal on purpose: hiding is reversible with one click, so it
 * should not cost the user an undo step to get back.
 */
export const setSectionHidden =
  (sectionId: string, hidden: boolean): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section === undefined) {
      return;
    }

    if (hidden) {
      section.hidden = true;
    } else {
      delete section.hidden;
    }
  };

/**
 * Sets or clears a section's icon.
 *
 * Stored as an `IconRef` rather than a component or a glyph, so a resume saved
 * today keeps rendering if the icon set is replaced, and so the Markdown codec
 * has a name to write.
 */
export const setSectionIcon =
  (sectionId: string, icon: IconRef | undefined): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section === undefined) {
      return;
    }

    if (icon === undefined) {
      delete section.icon;
    } else {
      section.icon = icon;
    }
  };

/**
 * Whether the section starts on a fresh sheet.
 *
 * `auto` deletes the key rather than storing the word, so a document carries a
 * `style` object only when something in it is actually overridden, and a
 * Markdown round trip, which has no syntax for section style, does not have to
 * preserve a field that says "default".
 */
export const setSectionBreakBefore =
  (sectionId: string, breakBefore: "auto" | "page"): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section === undefined) {
      return;
    }

    if (breakBefore === "auto") {
      if (section.style !== undefined) {
        delete section.style.breakBefore;

        // An override object holding nothing is noise in the document and in
        // every diff of it.
        if (Object.keys(section.style).length === 0) {
          delete section.style;
        }
      }

      return;
    }

    section.style = { ...section.style, breakBefore };
  };

/**
 * How many columns a section is set in.
 *
 * One column deletes the key, for the same reason `setSectionBreakBefore` does
 * on `auto`: the default is what a document without an override already means,
 * and an override object holding nothing is noise in every diff of it.
 */
export const setSectionColumns =
  (sectionId: string, columns: 1 | 2): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section === undefined) {
      return;
    }

    if (columns === 1) {
      if (section.style !== undefined) {
        delete section.style.columns;

        if (Object.keys(section.style).length === 0) {
          delete section.style;
        }
      }

      return;
    }

    section.style = { ...section.style, columns };
  };

export const moveSection =
  (from: number, to: number): Recipe =>
  (draft) => {
    moveWithin(draft.content.sections, from, to);
  };

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export const addBlock =
  (sectionId: string, block: Block, atIndex?: number): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section === undefined) {
      return;
    }

    const index = atIndex ?? section.blocks.length;
    section.blocks.splice(index, 0, block as Draft<Block>);
  };

/**
 * A copy of a block, directly after it, with its own id.
 *
 * Copied through JSON because the source is an Immer draft, which
 * `structuredClone` refuses, and a block is plain data with nothing in it that
 * JSON would drop. Nothing inside a block has an id of its own (a bullet is its
 * position), so renewing the block's is all that keeps the two apart.
 */
export const duplicateBlock =
  (sectionId: string, blockId: string): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const index =
      section?.blocks.findIndex((block) => block.id === blockId) ?? -1;
    const source = section?.blocks[index];

    if (section === undefined || source === undefined) {
      return;
    }

    const copy = JSON.parse(JSON.stringify(source)) as Block;

    section.blocks.splice(index + 1, 0, {
      ...copy,
      id: createId(),
    } as Draft<Block>);
  };

export const removeBlock =
  (sectionId: string, blockId: string): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const index =
      section?.blocks.findIndex((block) => block.id === blockId) ?? -1;

    if (section !== undefined && index !== -1) {
      section.blocks.splice(index, 1);
    }
  };

export const moveBlock =
  (sectionId: string, from: number, to: number): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);

    if (section !== undefined) {
      moveWithin(section.blocks, from, to);
    }
  };

/**
 * Moves a block to another section, which is what a cross-section drag does.
 * Removing and re-adding would produce two undo steps for one gesture.
 */
export const moveBlockToSection =
  (
    fromSectionId: string,
    blockId: string,
    toSectionId: string,
    toIndex: number,
  ): Recipe =>
  (draft) => {
    const source = findSection(draft, fromSectionId);
    const target = findSection(draft, toSectionId);

    if (source === undefined || target === undefined) {
      return;
    }

    const index = source.blocks.findIndex((block) => block.id === blockId);

    if (index === -1) {
      return;
    }

    const [moved] = source.blocks.splice(index, 1);

    if (moved !== undefined) {
      target.blocks.splice(
        Math.max(0, Math.min(toIndex, target.blocks.length)),
        0,
        moved,
      );
    }
  };

/**
 * How wide an image block draws, as a percentage of the content column.
 *
 * `undefined` means full width, which is what the figure gets with no inline
 * width at all, so clearing it removes the property rather than writing 100.
 * The model, the Markdown codec and the renderer have all supported this from
 * the start; nothing set it, so every image inserted from the panel was full
 * width for ever.
 */
export const setImageWidth =
  (
    sectionId: string,
    blockId: string,
    widthPercent: number | undefined,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block === undefined || block.kind !== "image") {
      return;
    }

    if (widthPercent === undefined) {
      delete block.widthPercent;
      return;
    }

    // Clamped to the schema's own bounds, so a control that offers a bad number
    // cannot write a document that fails validation on the way to disk.
    block.widthPercent = Math.max(1, Math.min(100, Math.round(widthPercent)));
  };

/**
 * Replaces the text of whichever field a block exposes.
 *
 * The visual editor edits one field at a time, so this takes the block kind's
 * text-bearing path rather than a whole replacement block, that keeps the
 * write-back small and the undo step precise.
 */
export const setBlockText =
  (sectionId: string, blockId: string, value: InlineText): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block === undefined) {
      return;
    }

    switch (block.kind) {
      case "paragraph":
        block.text = value;
        break;
      case "entry":
        block.title = value;
        break;
      case "iconLabel":
        block.label = value;
        break;
      case "heading":
        block.text = value;
        break;
      // Lists, quotes, tables, tags, images, dividers, code and raw passthrough
      // have no single text field; they are edited through their own operations,
      // or in the Markdown pane where their content is literal.
      case "bulletList":
      case "quote":
      case "table":
      case "code":
      case "tagList":
      case "image":
      case "divider":
      case "raw":
        break;
    }
  };

/**
 * One item of a list, at any nesting depth.
 *
 * The path is one index per level, outermost first, `[2, 0]` is the first
 * sub-item of the third item. Items carry no id in the model, so position is
 * their identity, and a path is what a position means once lists can nest.
 */
export const setBulletItem =
  (
    sectionId: string,
    blockId: string,
    path: ReadonlyArray<number>,
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind !== "bulletList" || path.length === 0) {
      return;
    }

    let items: Array<ListItem> | undefined = block.items;

    for (const index of path.slice(0, -1)) {
      items = items?.[index]?.list?.items;
    }

    const last = path[path.length - 1] as number;
    const item = items?.[last];

    if (item !== undefined) {
      item.text = value;
    }
  };

/** One paragraph of a block quote. */
export const setQuoteParagraph =
  (
    sectionId: string,
    blockId: string,
    index: number,
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind === "quote" && index < block.paragraphs.length) {
      block.paragraphs[index] = value;
    }
  };

/**
 * One cell of a table.
 *
 * `row` is `-1` for the header, because GFM keeps the header outside the body
 * and so does the model, and a sentinel reads better at the call site than a
 * second recipe that differs in one line.
 */
export const setTableCell =
  (
    sectionId: string,
    blockId: string,
    row: number,
    column: number,
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind !== "table") {
      return;
    }

    const cells = row < 0 ? block.head : block.rows[row];

    if (cells !== undefined && column < cells.length) {
      cells[column] = value;
    }
  };

/**
 * One field of an entry.
 *
 * Separate from `setBlockText` because an entry is the one block with several
 * independent runs of text, and the visual editor edits each in place. Naming the
 * field rather than adding four near-identical recipes keeps the call sites at
 * the paper honest about which one they are writing.
 *
 * An empty value clears the optional fields rather than storing an empty array:
 * the renderer branches on `undefined` to decide whether the comma, the dates
 * block or the summary paragraph exist at all, and an empty array would leave
 * their punctuation and spacing behind.
 */
export const setEntryField =
  (
    sectionId: string,
    blockId: string,
    field: "title" | "subtitle" | "location" | "summary",
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind !== "entry") {
      return;
    }

    if (field === "title") {
      block.title = value;
      return;
    }

    if (value.length === 0) {
      delete block[field];
      return;
    }

    block[field] = value;
  };

/**
 * An entry's dates, from the paper. `undefined` removes them, which is what
 * clearing the field means, and leaves no empty `dateRange` behind for the
 * renderer to branch on.
 */
export const setEntryDateRange =
  (sectionId: string, blockId: string, range: DateRange | undefined): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind !== "entry") {
      return;
    }

    if (range === undefined) {
      delete block.dateRange;
      return;
    }

    block.dateRange = range;
  };

/** One bullet of an entry. Entry bullets are a different array from a bullet
 * list's items, so they need their own operation. */
export const setEntryBullet =
  (
    sectionId: string,
    blockId: string,
    itemIndex: number,
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind === "entry" && itemIndex < block.bullets.length) {
      block.bullets[itemIndex] = value;
    }
  };

/**
 * The recipes below add, remove and move the parts inside a block, which carry
 * no ids: an entry's bullet, a list's item, a tag. Position is their identity,
 * so each one takes an index (or a path, for a list that nests) and does nothing
 * when it points at something that is not there. That is what lets a stale
 * request from the paper, one that raced an undo, fall through harmlessly
 * rather than land on whichever item now sits at that index.
 */

const blockOf = (
  draft: Draft<ResumeDocument>,
  sectionId: string,
  blockId: string,
): Draft<Block> | undefined =>
  findSection(draft, sectionId)?.blocks.find(
    (candidate) => candidate.id === blockId,
  );

/** An empty bullet at `atIndex`, which is where the new one will be. */
export const addEntryBullet =
  (sectionId: string, blockId: string, atIndex: number): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);

    if (
      block?.kind === "entry" &&
      atIndex >= 0 &&
      atIndex <= block.bullets.length
    ) {
      block.bullets.splice(atIndex, 0, []);
    }
  };

export const removeEntryBullet =
  (sectionId: string, blockId: string, index: number): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);

    if (block?.kind === "entry" && index >= 0 && index < block.bullets.length) {
      block.bullets.splice(index, 1);
    }
  };

export const moveEntryBullet =
  (sectionId: string, blockId: string, from: number, to: number): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);

    if (block?.kind === "entry") {
      moveWithin(block.bullets, from, to);
    }
  };

/**
 * The list a path points into, and the position within it.
 *
 * `[2, 0]` is the first item of the list nested under the third item, so the
 * list is found by walking all but the last index, and the last is the position.
 */
const listAt = (
  block: Draft<Block>,
  path: ReadonlyArray<number>,
): { items: Array<Draft<ListItem>>; index: number } | undefined => {
  if (block.kind !== "bulletList" || path.length === 0) {
    return undefined;
  }

  let items: Array<Draft<ListItem>> | undefined = block.items;

  for (const step of path.slice(0, -1)) {
    items = items?.[step]?.list?.items;
  }

  return items === undefined
    ? undefined
    : { items, index: path[path.length - 1] as number };
};

/**
 * An empty item, at `path`, which is where the new one will be.
 *
 * A task item makes the next one a task item too: pressing Enter in a checklist
 * means "another box", and a plain bullet in the middle of it would be a surprise.
 */
export const addBulletItem =
  (sectionId: string, blockId: string, path: ReadonlyArray<number>): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);
    const at = block === undefined ? undefined : listAt(block, path);

    if (at === undefined || at.index < 0 || at.index > at.items.length) {
      return;
    }

    const before = at.items[at.index - 1];

    at.items.splice(at.index, 0, {
      text: [],
      ...(before?.checked === undefined ? {} : { checked: false }),
    });
  };

/**
 * Removes an item along with whatever was nested under it.
 *
 * A nested list left with no items is dropped, because a list with nothing in it
 * would be written to Markdown as a bare marker.
 */
export const removeBulletItem =
  (sectionId: string, blockId: string, path: ReadonlyArray<number>): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);
    const at = block === undefined ? undefined : listAt(block, path);

    if (at === undefined || at.index < 0 || at.index >= at.items.length) {
      return;
    }

    at.items.splice(at.index, 1);

    if (at.items.length === 0 && path.length > 1) {
      const parent = listAt(block as Draft<Block>, path.slice(0, -1));
      const owner = parent?.items[parent.index];

      if (owner !== undefined) {
        delete owner.list;
      }
    }
  };

/** One step up or down among its siblings. It never changes the depth. */
export const moveBulletItem =
  (
    sectionId: string,
    blockId: string,
    path: ReadonlyArray<number>,
    direction: -1 | 1,
  ): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);
    const at = block === undefined ? undefined : listAt(block, path);

    if (at !== undefined) {
      moveWithin(at.items, at.index, at.index + direction);
    }
  };

/** An empty tag at `atIndex`. It is a blank string until the owner types, and
 * `setTag` removes it again if they leave it blank. */
export const addTag =
  (sectionId: string, blockId: string, atIndex: number): Recipe =>
  (draft) => {
    const block = blockOf(draft, sectionId, blockId);

    if (
      block?.kind === "tagList" &&
      atIndex >= 0 &&
      atIndex <= block.tags.length
    ) {
      block.tags.splice(atIndex, 0, "");
    }
  };

/**
 * One tag.
 *
 * Tags are plain strings, not rich text, so this takes a string, and an emptied
 * tag is removed rather than left as a blank chip, which is what the user means
 * when they clear one.
 */
export const setTag =
  (
    sectionId: string,
    blockId: string,
    itemIndex: number,
    value: string,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId);
    const block = section?.blocks.find((candidate) => candidate.id === blockId);

    if (block?.kind !== "tagList" || itemIndex >= block.tags.length) {
      return;
    }

    const trimmed = value.trim();

    if (trimmed === "") {
      block.tags.splice(itemIndex, 1);
      return;
    }

    block.tags[itemIndex] = trimmed;
  };

// ---------------------------------------------------------------------------
// Style, template, custom CSS
// ---------------------------------------------------------------------------

/**
 * Patches the style tokens.
 *
 * Deep-merges one level per group (`paper`, `typography`, ...) because the style
 * panel changes a single control at a time and should not have to resend the
 * whole group.
 */
export const patchDesign =
  (patch: DeepPartial<DesignConfig>): Recipe =>
  (draft) => {
    // `Object.entries` widens away the optionality, so the entries are retyped
    // to keep the runtime guard against an explicitly-undefined group honest.
    const entries = Object.entries(patch) as Array<
      [keyof DesignConfig, Record<string, unknown> | undefined]
    >;

    for (const [group, values] of entries) {
      if (values === undefined) {
        continue;
      }

      const current = draft.design[group];

      if (current === undefined) {
        // A group that did not exist when this document was written,
        // `pagination`, so far. Assigning it is what makes an old document
        // settable without a migration that touches every row.
        Object.assign(draft.design, { [group]: { ...values } });
        continue;
      }

      Object.assign(current, values);
    }
  };

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K];
};

/**
 * Switches template.
 *
 * `resetDesign` is the caller's answer to "keep my customisations?", the
 * template's own tokens are only imposed when the user says yes, because
 * silently discarding their styling would be destructive.
 */
export const setTemplate =
  (templateId: TemplateId, options: { resetDesign: boolean }): Recipe =>
  (draft) => {
    draft.templateId = templateId;

    if (options.resetDesign) {
      draft.design = templateDefaults(templateId, draft.kind);
    }
  };

export const setCustomCss =
  (css: string): Recipe =>
  (draft) => {
    draft.customCss = css;
  };
