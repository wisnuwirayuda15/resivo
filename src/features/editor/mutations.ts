import { createId } from '@/lib/id'
import { createSection, text } from '@/features/resume/model/index'
import { templateDefaults } from '@/features/templates/defaults'

import type { Draft } from 'immer'
import type {
  Block,
  DesignConfig,
  IconRef,
  InlineText,
  ListItem,
  ResumeDocument,
  Section,
  SectionKind,
  TemplateId,
} from '@/features/resume/model/document'

/**
 * Typed edits to the document.
 *
 * Every editing surface — the visual editor, the style panel, the template
 * picker, the Markdown codec — funnels through these rather than mutating the
 * document directly. That is what keeps a single undo history meaningful: one
 * call here is one user-visible change, whatever produced it.
 *
 * Each function is an Immer recipe operating on a draft, so the store gets
 * structural sharing for free and snapshots stay cheap.
 */

export type Recipe = (draft: Draft<ResumeDocument>) => void

const findSection = (
  draft: Draft<ResumeDocument>,
  sectionId: string,
): Draft<Section> | undefined =>
  draft.content.sections.find((section) => section.id === sectionId)

/** Moves an item within an array, clamping the destination. Shared by section
 * and block reordering so both behave identically at the boundaries. */
const moveWithin = <T>(items: Array<T>, from: number, to: number): void => {
  if (from < 0 || from >= items.length) {
    return
  }

  const clamped = Math.max(0, Math.min(to, items.length - 1))
  const [moved] = items.splice(from, 1)

  if (moved !== undefined) {
    items.splice(clamped, 0, moved)
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export const setHeaderName =
  (name: InlineText): Recipe =>
  (draft) => {
    draft.content.header.name = name
  }

export const setHeaderHeadline =
  (headline: InlineText): Recipe =>
  (draft) => {
    draft.content.header.headline = headline
  }

export const setAvatarImage =
  (imageId: string | undefined): Recipe =>
  (draft) => {
    if (imageId === undefined) {
      delete draft.content.header.avatarImageId
    } else {
      draft.content.header.avatarImageId = imageId
    }
  }

export const addContact =
  (label = ''): Recipe =>
  (draft) => {
    draft.content.header.contacts.push({ id: createId(), label: text(label) })
  }

export const updateContactLabel =
  (contactId: string, label: InlineText): Recipe =>
  (draft) => {
    const contact = draft.content.header.contacts.find(
      (item) => item.id === contactId,
    )

    if (contact !== undefined) {
      contact.label = label
    }
  }

export const removeContact =
  (contactId: string): Recipe =>
  (draft) => {
    // Splice rather than reassign a filtered array: reassigning would hand Immer
    // a new array even when nothing matched, which would cost the user an undo
    // step for an edit that changed nothing.
    const index = draft.content.header.contacts.findIndex(
      (contact) => contact.id === contactId,
    )

    if (index !== -1) {
      draft.content.header.contacts.splice(index, 1)
    }
  }

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const addSection =
  (kind: SectionKind, title: string, atIndex?: number): Recipe =>
  (draft) => {
    const section = createSection(kind, title)
    const index = atIndex ?? draft.content.sections.length

    draft.content.sections.splice(index, 0, section)
  }

export const removeSection =
  (sectionId: string): Recipe =>
  (draft) => {
    const index = draft.content.sections.findIndex(
      (section) => section.id === sectionId,
    )

    if (index !== -1) {
      draft.content.sections.splice(index, 1)
    }
  }

export const setSectionTitle =
  (sectionId: string, title: InlineText): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)

    if (section !== undefined) {
      section.title = title
    }
  }

/**
 * Hides a section instead of deleting it.
 *
 * Distinct from removal on purpose: hiding is reversible with one click, so it
 * should not cost the user an undo step to get back.
 */
export const setSectionHidden =
  (sectionId: string, hidden: boolean): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)

    if (section === undefined) {
      return
    }

    if (hidden) {
      section.hidden = true
    } else {
      delete section.hidden
    }
  }

/**
 * Sets or clears a section's icon.
 *
 * Stored as an `IconRef` rather than a component or a glyph, so a resume saved
 * today keeps rendering if the icon set is replaced — and so the Markdown codec
 * has a name to write.
 */
export const setSectionIcon =
  (sectionId: string, icon: IconRef | undefined): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)

    if (section === undefined) {
      return
    }

    if (icon === undefined) {
      delete section.icon
    } else {
      section.icon = icon
    }
  }

export const moveSection =
  (from: number, to: number): Recipe =>
  (draft) => {
    moveWithin(draft.content.sections, from, to)
  }

/** Reorders by id — what drag-and-drop produces, since dnd-kit works in ids. */
export const reorderSections =
  (orderedIds: Array<string>): Recipe =>
  (draft) => {
    const byId = new Map(
      draft.content.sections.map((section) => [section.id, section]),
    )
    const reordered = orderedIds
      .map((id) => byId.get(id))
      .filter((section): section is Draft<Section> => section !== undefined)

    // Anything the caller did not mention keeps its relative position at the
    // end, so a stale id list can never silently drop a section.
    const missing = draft.content.sections.filter(
      (section) => !orderedIds.includes(section.id),
    )
    const next = [...reordered, ...missing]

    // Skip the assignment when the order is already correct, so a drag that
    // ends where it started does not become an undo step.
    const unchanged = next.every(
      (section, index) => draft.content.sections[index]?.id === section.id,
    )

    if (!unchanged) {
      draft.content.sections = next
    }
  }

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export const addBlock =
  (sectionId: string, block: Block, atIndex?: number): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)

    if (section === undefined) {
      return
    }

    const index = atIndex ?? section.blocks.length
    section.blocks.splice(index, 0, block as Draft<Block>)
  }

export const removeBlock =
  (sectionId: string, blockId: string): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)
    const index =
      section?.blocks.findIndex((block) => block.id === blockId) ?? -1

    if (section !== undefined && index !== -1) {
      section.blocks.splice(index, 1)
    }
  }

export const moveBlock =
  (sectionId: string, from: number, to: number): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)

    if (section !== undefined) {
      moveWithin(section.blocks, from, to)
    }
  }

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
    const source = findSection(draft, fromSectionId)
    const target = findSection(draft, toSectionId)

    if (source === undefined || target === undefined) {
      return
    }

    const index = source.blocks.findIndex((block) => block.id === blockId)

    if (index === -1) {
      return
    }

    const [moved] = source.blocks.splice(index, 1)

    if (moved !== undefined) {
      target.blocks.splice(
        Math.max(0, Math.min(toIndex, target.blocks.length)),
        0,
        moved,
      )
    }
  }

/**
 * Replaces the text of whichever field a block exposes.
 *
 * The visual editor edits one field at a time, so this takes the block kind's
 * text-bearing path rather than a whole replacement block — that keeps the
 * write-back small and the undo step precise.
 */
export const setBlockText =
  (sectionId: string, blockId: string, value: InlineText): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block === undefined) {
      return
    }

    switch (block.kind) {
      case 'paragraph':
        block.text = value
        break
      case 'entry':
        block.title = value
        break
      case 'iconLabel':
        block.label = value
        break
      case 'heading':
        block.text = value
        break
      // Lists, quotes, tables, tags, images, dividers, code and raw passthrough
      // have no single text field; they are edited through their own operations,
      // or in the Markdown pane where their content is literal.
      case 'bulletList':
      case 'quote':
      case 'table':
      case 'code':
      case 'tagList':
      case 'image':
      case 'divider':
      case 'raw':
        break
    }
  }

/**
 * One item of a list, at any nesting depth.
 *
 * The path is one index per level, outermost first — `[2, 0]` is the first
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
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block?.kind !== 'bulletList' || path.length === 0) {
      return
    }

    let items: Array<ListItem> | undefined = block.items

    for (const index of path.slice(0, -1)) {
      items = items?.[index]?.list?.items
    }

    const last = path[path.length - 1] as number
    const item = items?.[last]

    if (item !== undefined) {
      item.text = value
    }
  }

/** One paragraph of a block quote. */
export const setQuoteParagraph =
  (
    sectionId: string,
    blockId: string,
    index: number,
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block?.kind === 'quote' && index < block.paragraphs.length) {
      block.paragraphs[index] = value
    }
  }

/**
 * One cell of a table.
 *
 * `row` is `-1` for the header, because GFM keeps the header outside the body
 * and so does the model — and a sentinel reads better at the call site than a
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
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block?.kind !== 'table') {
      return
    }

    const cells = row < 0 ? block.head : block.rows[row]

    if (cells !== undefined && column < cells.length) {
      cells[column] = value
    }
  }

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
    field: 'title' | 'subtitle' | 'location' | 'summary',
    value: InlineText,
  ): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block?.kind !== 'entry') {
      return
    }

    if (field === 'title') {
      block.title = value
      return
    }

    if (value.length === 0) {
      delete block[field]
      return
    }

    block[field] = value
  }

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
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block?.kind === 'entry' && itemIndex < block.bullets.length) {
      block.bullets[itemIndex] = value
    }
  }

/**
 * One tag.
 *
 * Tags are plain strings, not rich text, so this takes a string — and an emptied
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
    const section = findSection(draft, sectionId)
    const block = section?.blocks.find((candidate) => candidate.id === blockId)

    if (block?.kind !== 'tagList' || itemIndex >= block.tags.length) {
      return
    }

    const trimmed = value.trim()

    if (trimmed === '') {
      block.tags.splice(itemIndex, 1)
      return
    }

    block.tags[itemIndex] = trimmed
  }

/** Replaces a block wholesale. Used by the Markdown codec, which reconstructs
 * blocks rather than patching fields. */
export const replaceBlock =
  (sectionId: string, block: Block): Recipe =>
  (draft) => {
    const section = findSection(draft, sectionId)

    if (section === undefined) {
      return
    }

    const index = section.blocks.findIndex(
      (candidate) => candidate.id === block.id,
    )

    if (index !== -1) {
      section.blocks[index] = block
    }
  }

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
    >

    for (const [group, values] of entries) {
      if (values === undefined) {
        continue
      }

      Object.assign(draft.design[group], values)
    }
  }

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K]
}

/**
 * Switches template.
 *
 * `resetDesign` is the caller's answer to "keep my customisations?" — the
 * template's own tokens are only imposed when the user says yes, because
 * silently discarding their styling would be destructive.
 */
export const setTemplate =
  (templateId: TemplateId, options: { resetDesign: boolean }): Recipe =>
  (draft) => {
    draft.templateId = templateId

    if (options.resetDesign) {
      draft.design = templateDefaults(templateId)
    }
  }

export const setCustomCss =
  (css: string): Recipe =>
  (draft) => {
    draft.customCss = css
  }
