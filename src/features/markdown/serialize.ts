import { plainText } from '@/features/resume/model/index'

import {
  CONTACT_DIRECTIVE,
  ENTRY_DIRECTIVE,
  ICON_DIRECTIVE,
  IMAGE_DIRECTIVE,
  LABEL_DIRECTIVE,
  TAGS_DIRECTIVE,
  TAG_SEPARATOR,
} from './spec'

import type {
  Block,
  EntryBlock,
  InlineNode,
  InlineText,
  Mark,
  ResumeDocument,
  Section,
} from '@/features/resume/model/document'

/**
 * The document as Resivo-Markdown.
 *
 * Hand-rolled rather than `remark-stringify`, for one reason: this output is
 * compared against itself. The editor shows it, autosave stores the model, and a
 * reparse has to produce the same tree — so the same document must always
 * produce the same bytes, down to blank lines. A general stringifier is free to
 * change its formatting between versions, and each of those changes would read
 * to the user as an edit they did not make.
 *
 * Everything the model can hold has a written form here except three fields that
 * have no syntax: a section's `hidden` flag, its icon, and its style override.
 * Those survive a round trip because `parse` matches each section back to the one
 * it came from and carries them across — see the note there. Writing them into
 * the source would put editor state in the user's document, where the first
 * thing they would do is delete it.
 */

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

/**
 * Characters that would otherwise be read as markup.
 *
 * Escaped everywhere in a text run, not only where they happen to be
 * significant: a conservative escape is always safe to read back, whereas
 * deciding case by case means a literal asterisk in someone's job title
 * eventually turns their bullet list italic.
 */
const ESCAPE_PATTERN = /[\\`*_[\]<>~]/g

const escapeText = (value: string): string =>
  value
    .replace(ESCAPE_PATTERN, (character) => `\\${character}`)
    // A colon only matters where a directive could start: directly before a
    // name, or doubled. Escaping every colon would ruin every URL and time.
    .replace(/:(?=:|[A-Za-z][A-Za-z0-9-]*[[{])/g, '\\:')

/** Escapes what would otherwise close a directive's attribute list. */
const escapeAttribute = (value: string): string =>
  value.replace(/["\\]/g, (character) => `\\${character}`)

const attributes = (entries: Array<[string, string | undefined]>): string => {
  const written = entries
    .filter((entry): entry is [string, string] => {
      const [, value] = entry

      return value !== undefined && value !== ''
    })
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)

  return written.length === 0 ? '' : `{${written.join(' ')}}`
}

// ---------------------------------------------------------------------------
// Inline text
// ---------------------------------------------------------------------------

/**
 * Marks are written in a fixed order, outermost first.
 *
 * `code` is innermost because its content is literal — anything wrapped inside a
 * code span stops being markup. The rest have no meaning to their order, so
 * fixing it is what makes the output stable: the model stores a set, and a set
 * has no order to preserve.
 */
const MARK_ORDER: Array<Mark> = ['bold', 'italic', 'strike', 'code']

const MARK_DELIMITERS: Record<Mark, string> = {
  bold: '**',
  italic: '_',
  strike: '~~',
  code: '`',
}

const serializeNode = (node: InlineNode): string => {
  switch (node.type) {
    case 'text': {
      const marks = node.marks ?? []
      // Inside a code span the text is literal, so escaping it would put the
      // backslashes on screen.
      const inner = marks.includes('code') ? node.text : escapeText(node.text)

      return MARK_ORDER.filter((mark) => marks.includes(mark)).reduceRight(
        (text, mark) => {
          const delimiter = MARK_DELIMITERS[mark]

          return `${delimiter}${text}${delimiter}`
        },
        inner,
      )
    }

    case 'link':
      return `[${serializeInline(node.children)}](${node.href})`

    case 'icon':
      return `:${ICON_DIRECTIVE}${attributes([
        ['name', node.icon.name],
        ['weight', node.icon.weight],
      ])}`
  }
}

export const serializeInline = (text: InlineText): string =>
  text.map(serializeNode).join('')

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const serializeBullets = (items: Array<InlineText>): Array<string> =>
  items.map((item) => `- ${serializeInline(item)}`)

const serializeEntry = (block: EntryBlock): string => {
  const range = block.dateRange
  const open = `:::${ENTRY_DIRECTIVE}${attributes([
    ['title', serializeInline(block.title)],
    ['subtitle', block.subtitle && serializeInline(block.subtitle)],
    ['location', block.location && serializeInline(block.location)],
    ['start', range?.start],
    ['end', range?.end],
    ['current', range?.current === true ? 'true' : undefined],
  ])}`

  const body: Array<string> = []

  if (block.summary !== undefined && block.summary.length > 0) {
    body.push(serializeInline(block.summary))
  }

  if (block.bullets.length > 0) {
    body.push(serializeBullets(block.bullets).join('\n'))
  }

  // A container directive needs a blank line before its fence when it has
  // content, and reads better with one when it does not.
  return [open, ...body, ':::'].join('\n\n')
}

const serializeBlock = (block: Block): string => {
  switch (block.kind) {
    case 'paragraph':
      return serializeInline(block.text)

    case 'bulletList':
      return serializeBullets(block.items).join('\n')

    case 'entry':
      return serializeEntry(block)

    case 'tagList':
      return `::${TAGS_DIRECTIVE}[${block.tags
        .map(escapeText)
        .join(TAG_SEPARATOR)}]`

    case 'divider':
      return '---'

    case 'iconLabel':
      return `::${LABEL_DIRECTIVE}[${serializeInline(block.label)}]${attributes(
        [
          ['icon', block.icon.name],
          ['weight', block.icon.weight],
        ],
      )}`

    case 'image':
      return `::${IMAGE_DIRECTIVE}[${escapeText(block.alt)}]${attributes([
        ['id', block.imageId],
        [
          'width',
          block.widthPercent === undefined
            ? undefined
            : String(block.widthPercent),
        ],
      ])}`

    /**
     * Written back exactly as it arrived. This is the block that makes "never
     * silently drop input" true: anything the model cannot represent is kept as
     * source text and reproduced verbatim, so a table someone pasted survives
     * every save even though nothing understands it.
     */
    case 'raw':
      return block.markdown
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const serializeSection = (section: Section): Array<string> => {
  const heading = `## ${plainText(section.title)}`

  return [heading, ...section.blocks.map(serializeBlock)]
}

export const serializeDocument = (document: ResumeDocument): string => {
  const { header, sections } = document.content
  const parts: Array<string> = []

  // The name is the document's H1 whether or not it is set, so the file always
  // has the shape the parser expects and an empty resume is still editable.
  parts.push(`# ${serializeInline(header.name)}`)

  if (header.headline !== undefined && header.headline.length > 0) {
    parts.push(serializeInline(header.headline))
  }

  if (header.contacts.length > 0) {
    // One line each, kept as a single block so a blank line never lands between
    // two contacts.
    parts.push(
      header.contacts
        .map(
          (contact) =>
            `::${CONTACT_DIRECTIVE}[${serializeInline(
              contact.label,
            )}]${attributes([
              ['icon', contact.icon?.name],
              ['weight', contact.icon?.weight],
              ['href', contact.href],
            ])}`,
        )
        .join('\n'),
    )
  }

  for (const section of sections) {
    parts.push(...serializeSection(section))
  }

  // One blank line between blocks, and a trailing newline, which is what every
  // editor and every diff expects a text file to end with.
  return `${parts.join('\n\n')}\n`
}
