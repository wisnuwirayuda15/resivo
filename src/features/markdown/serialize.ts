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
  CodeBlock,
  EntryBlock,
  InlineNode,
  InlineText,
  Mark,
  NestedList,
  ResumeDocument,
  Section,
  TableAlign,
  TableBlock,
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

/**
 * A list, nesting and all.
 *
 * Each level is indented by exactly the width of its parent's marker, which is
 * what CommonMark requires for the sublist to belong to the item above rather
 * than start a new list. That is why the indent is computed from the marker
 * instead of being a fixed two spaces: `10. ` is four columns wide and `- ` is
 * two.
 */
const serializeList = (list: NestedList, indent: string): Array<string> => {
  const lines: Array<string> = []
  const first = list.start ?? 1

  list.items.forEach((item, index) => {
    const marker = list.ordered === true ? `${first + index}. ` : '- '
    // `[x] ` is part of the item's content in GFM, so it goes after the marker
    // and before the text, and the indent below still measures only the marker.
    const box = item.checked === undefined ? '' : item.checked ? '[x] ' : '[ ] '

    lines.push(`${indent}${marker}${box}${serializeInline(item.text)}`)

    if (item.list !== undefined) {
      lines.push(
        ...serializeList(item.list, `${indent}${' '.repeat(marker.length)}`),
      )
    }
  })

  return lines
}

/** Escapes what would otherwise be read as a cell boundary. */
const escapeCell = (text: InlineText): string =>
  serializeInline(text).replace(/\|/g, '\\|')

const ALIGN_RULE: Record<TableAlign, string> = {
  left: ':---',
  center: ':---:',
  right: '---:',
}

const serializeTable = (block: TableBlock): string => {
  // A GFM table's delimiter row fixes the column count, so every row is written
  // to the width of the widest one. A short row would otherwise silently drop
  // its missing cells on the next parse.
  const width = Math.max(
    block.head.length,
    ...block.rows.map((row) => row.length),
    1,
  )

  const row = (cells: Array<InlineText>): string =>
    `| ${Array.from({ length: width }, (_, index) =>
      escapeCell(cells[index] ?? []),
    ).join(' | ')} |`

  const rule = `| ${Array.from({ length: width }, (_, index) => {
    const align = block.align[index]

    return align === undefined || align === null ? '---' : ALIGN_RULE[align]
  }).join(' | ')} |`

  return [row(block.head), rule, ...block.rows.map(row)].join('\n')
}

/**
 * A fenced code block, with a fence long enough to hold its content.
 *
 * Three backticks is the usual fence, but code that itself contains a run of
 * three would end the block early — so the fence is always one backtick longer
 * than the longest run inside it.
 */
const serializeCode = (block: CodeBlock): string => {
  const longest = [...block.code.matchAll(/`+/g)].reduce(
    (length, match) => Math.max(length, match[0].length),
    0,
  )
  const fence = '`'.repeat(Math.max(3, longest + 1))

  return `${fence}${block.language ?? ''}\n${block.code}\n${fence}`
}

/** Every line prefixed, with a bare `>` between paragraphs — which is what keeps
 * two paragraphs inside one quote instead of splitting it in two. */
const serializeQuote = (paragraphs: Array<InlineText>): string =>
  paragraphs.map((text) => `> ${serializeInline(text)}`).join('\n>\n')

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

    case 'heading':
      return `${'#'.repeat(block.level)} ${serializeInline(block.text)}`

    case 'bulletList':
      return serializeList(block, '').join('\n')

    case 'quote':
      return serializeQuote(block.paragraphs)

    case 'code':
      return serializeCode(block)

    case 'table':
      return serializeTable(block)

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

/**
 * Always `##`, whatever depth the source used.
 *
 * The parser takes the shallowest heading in the file as the section level, so a
 * document written with `###` headings is understood — and then normalized to
 * `##` here, once, on the first save. Writing the original depth back instead
 * would mean storing it in the document, and a heading level is not a fact about
 * a resume.
 */
const serializeSection = (section: Section): Array<string> => {
  const title = plainText(section.title)
  // An untitled section is where content that arrived before any heading lives.
  // `##` alone is a valid empty heading, and reads back as the same section.
  const heading = title === '' ? '##' : `## ${title}`

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
