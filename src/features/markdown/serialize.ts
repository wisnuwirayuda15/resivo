import { directiveToMarkdown } from 'mdast-util-directive'
import { gfmToMarkdown } from 'mdast-util-gfm'
import { toMarkdown } from 'mdast-util-to-markdown'

import { plainText } from '@/features/resume/model/index'

import {
  CONTACT_DIRECTIVE,
  ENTRY_DIRECTIVE,
  ICON_DIRECTIVE,
  IMAGE_DIRECTIVE,
  PAGE_BREAK_DIRECTIVE,
  LABEL_DIRECTIVE,
  TAGS_DIRECTIVE,
  TAG_SEPARATOR,
} from './spec'

import type { Options as ToMarkdownOptions } from 'mdast-util-to-markdown'
import type {
  BlockContent,
  Heading,
  List,
  ListItem as MdastListItem,
  PhrasingContent,
  Root,
  RootContent,
  TableRow,
} from 'mdast'
import type {
  Block,
  EntryBlock,
  InlineNode,
  InlineText,
  ListItem,
  Mark,
  NestedList,
  ResumeDocument,
  Section,
} from '@/features/resume/model/document'

/**
 * The document as Resivo-Markdown.
 *
 * Two steps, deliberately separate: this file maps the model onto an mdast tree,
 * and `mdast-util-to-markdown` writes that tree out. Nothing here emits a
 * character of Markdown itself.
 *
 * It was a hand-rolled string emitter until it had to grow tables, fences and
 * nested lists — at which point it was reimplementing, less well, the escaping
 * rules, fence-length arithmetic, cell padding and list indentation that the
 * `mdast` writer already has. The parser has always been `mdast`; making the
 * writer `mdast` too means one library defines what round-trips, in both
 * directions, rather than two implementations that agree until they do not.
 *
 * The output still has to be byte-stable — the editor shows it, autosave stores
 * the model, and a reparse has to produce the same tree, so the same document
 * must always produce the same bytes down to blank lines. `toMarkdown` is
 * deterministic given its options, so stability comes from pinning the options
 * here (see `WRITER`) and from the round-trip tests, rather than from writing
 * the characters by hand.
 *
 * Everything the model can hold has a written form except three fields that have
 * no syntax: a section's `hidden` flag, its icon, and its style override. Those
 * survive a round trip because `parse` matches each section back to the one it
 * came from and carries them across. Writing them into the source would put
 * editor state in the user's document, where the first thing they would do is
 * delete it.
 */

/**
 * Every formatting choice the writer makes, fixed.
 *
 * Left to its defaults `toMarkdown` would write `*` for emphasis and for bullets
 * and `***` for a rule, all of which are legal and none of which are what this
 * format looks like. Naming them here is also what makes the output stable
 * across a dependency upgrade: a default may change between versions, an option
 * that is set may not.
 */
const WRITER: ToMarkdownOptions = {
  bullet: '-',
  emphasis: '_',
  strong: '*',
  rule: '-',
  // Content one space after the marker, so a nested list is indented by exactly
  // the width of its parent's marker — which is what makes it a sublist rather
  // than a new list.
  listItemIndent: 'one',
  // Never indented code: four spaces of indentation is indistinguishable from a
  // deeply nested list item, and reads back as one.
  fences: true,
  extensions: [
    // Compact cells. The alternative pads every column to its widest value,
    // which turns a one-character edit in a table into a diff of every row.
    gfmToMarkdown({ tablePipeAlign: false }),
    directiveToMarkdown(),
  ],
  join: [
    /**
     * Contacts are written one per line with no blank line between them.
     *
     * Everything else in the document is separated by a blank line, which is
     * what `toMarkdown` does by default. Returning `0` here means "one newline",
     * and keeps the contact rows reading as the single block they are.
     */
    (left, right) =>
      left.type === 'leafDirective' &&
      right.type === 'leafDirective' &&
      left.name === CONTACT_DIRECTIVE &&
      right.name === CONTACT_DIRECTIVE
        ? 0
        : undefined,
  ],
}

// ---------------------------------------------------------------------------
// Inline text
// ---------------------------------------------------------------------------

/**
 * Marks are applied in a fixed order, outermost first.
 *
 * `code` is innermost because its content is literal — anything wrapped inside a
 * code span stops being markup. The rest have no meaning to their order, so
 * fixing it is what makes the output stable: the model stores a set, and a set
 * has no order to preserve.
 */
const MARK_ORDER: Array<Mark> = ['bold', 'italic', 'strike', 'code']

const WRAPPERS: Record<
  Exclude<Mark, 'code'>,
  (children: Array<PhrasingContent>) => PhrasingContent
> = {
  bold: (children) => ({ type: 'strong', children }),
  italic: (children) => ({ type: 'emphasis', children }),
  strike: (children) => ({ type: 'delete', children }),
}

/**
 * A directive attribute holding text.
 *
 * Flattened, not serialized: an attribute's value is literal text in the source,
 * so writing Markdown into one would mean the reader had to parse it back out —
 * and `parse` deliberately does not, because an entry title of `**Lead**` is a
 * title containing asterisks. Whatever quoting the value needs is
 * `directiveToMarkdown`'s job, which is the same library that reads it.
 */
const attributeText = (text: InlineText | undefined): string | undefined => {
  if (text === undefined) {
    return undefined
  }

  const flat = plainText(text)

  return flat === '' ? undefined : flat
}

/** Drops the attributes that have no value, so an absent field writes nothing
 * rather than an empty pair of quotes. */
const attributes = (
  entries: Record<string, string | undefined>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(entries).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  )

const inlineNode = (node: InlineNode): PhrasingContent => {
  switch (node.type) {
    case 'text': {
      const marks = node.marks ?? []
      const inner: PhrasingContent = marks.includes('code')
        ? { type: 'inlineCode', value: node.text }
        : { type: 'text', value: node.text }

      // Innermost outwards, so the fixed order above reads as written.
      return MARK_ORDER.filter(
        (mark): mark is Exclude<Mark, 'code'> => mark !== 'code',
      )
        .filter((mark) => marks.includes(mark))
        .reduceRight<PhrasingContent>(
          (children, mark) => WRAPPERS[mark]([children]),
          inner,
        )
    }

    case 'link':
      return {
        type: 'link',
        url: node.href,
        children: inlineText(node.children),
      }

    case 'icon':
      return {
        type: 'textDirective',
        name: ICON_DIRECTIVE,
        attributes: attributes({
          name: node.icon.name,
          weight: node.icon.weight,
        }),
        children: [],
      }
  }
}

const inlineText = (text: InlineText): Array<PhrasingContent> =>
  text.map(inlineNode)

/** A run on its own line. An empty run is an empty paragraph rather than a
 * missing one, so the block it belongs to keeps its shape. */
const paragraph = (text: InlineText): BlockContent => ({
  type: 'paragraph',
  children: inlineText(text),
})

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const listItem = (item: ListItem): MdastListItem => ({
  type: 'listItem',
  // `null` rather than absent: that is how mdast says "not a task item", and
  // `undefined` would write an empty checkbox.
  checked: item.checked ?? null,
  spread: false,
  children: [
    paragraph(item.text),
    ...(item.list === undefined ? [] : [list(item.list)]),
  ],
})

const list = (source: NestedList): List => ({
  type: 'list',
  ordered: source.ordered ?? false,
  start: source.ordered === true ? (source.start ?? 1) : null,
  spread: false,
  children: source.items.map(listItem),
})

const entry = (block: EntryBlock): RootContent => {
  const range = block.dateRange

  return {
    type: 'containerDirective',
    name: ENTRY_DIRECTIVE,
    attributes: attributes({
      title: attributeText(block.title),
      subtitle: attributeText(block.subtitle),
      location: attributeText(block.location),
      start: range?.start,
      end: range?.end,
      current: range?.current === true ? 'true' : undefined,
    }),
    children: [
      ...(block.summary === undefined || block.summary.length === 0
        ? []
        : [paragraph(block.summary)]),
      ...(block.bullets.length === 0
        ? []
        : [
            list({
              items: block.bullets.map((bullet) => ({ text: bullet })),
            }),
          ]),
    ],
  }
}

const tableRow = (cells: Array<InlineText>): TableRow => ({
  type: 'tableRow',
  children: cells.map((cell) => ({
    type: 'tableCell',
    children: inlineText(cell),
  })),
})

const blockNode = (block: Block): RootContent => {
  switch (block.kind) {
    case 'paragraph':
      return paragraph(block.text)

    case 'heading':
      return {
        type: 'heading',
        depth: block.level,
        children: inlineText(block.text),
      }

    case 'bulletList':
      return list(block)

    case 'quote':
      return {
        type: 'blockquote',
        children: block.paragraphs.map(paragraph),
      }

    case 'code':
      return {
        type: 'code',
        lang: block.language ?? null,
        meta: null,
        value: block.code,
      }

    case 'table':
      return {
        type: 'table',
        align: block.align,
        children: [tableRow(block.head), ...block.rows.map(tableRow)],
      }

    case 'entry':
      return entry(block)

    case 'tagList':
      return {
        type: 'leafDirective',
        name: TAGS_DIRECTIVE,
        attributes: {},
        children: [{ type: 'text', value: block.tags.join(TAG_SEPARATOR) }],
      }

    case 'divider':
      return { type: 'thematicBreak' }

    case 'pageBreak':
      return {
        type: 'leafDirective',
        name: PAGE_BREAK_DIRECTIVE,
        attributes: {},
        children: [],
      }

    case 'iconLabel':
      return {
        type: 'leafDirective',
        name: LABEL_DIRECTIVE,
        attributes: attributes({
          icon: block.icon.name,
          weight: block.icon.weight,
        }),
        children: inlineText(block.label),
      }

    case 'image':
      return {
        type: 'leafDirective',
        name: IMAGE_DIRECTIVE,
        attributes: attributes({
          id: block.imageId,
          width:
            block.widthPercent === undefined
              ? undefined
              : String(block.widthPercent),
        }),
        children: [{ type: 'text', value: block.alt }],
      }

    /**
     * Written back exactly as it arrived. An `html` node is the one mdast node
     * whose value is emitted verbatim, which is what makes "never silently drop
     * input" true: Markdown the model cannot represent is kept as source text
     * and reproduced character for character.
     */
    case 'raw':
      return { type: 'html', value: block.markdown }
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * A section's heading is always `##`, whatever depth the source used.
 *
 * The parser takes the shallowest heading in the file as the section level, so a
 * document written with `###` headings is understood — and then normalized here,
 * once, on the first save. Writing the original depth back instead would mean
 * storing it in the document, and a heading level is not a fact about a resume.
 *
 * The title is flattened, because a section's title is written as a heading and
 * read back as one; formatting inside it has nowhere to go.
 */
const sectionHeading = (section: Section): Heading => {
  const title = plainText(section.title)

  return {
    type: 'heading',
    depth: 2,
    // An untitled section — where content that arrived before any heading lives
    // — is a bare `##`, which reads back as the same empty title.
    children: title === '' ? [] : [{ type: 'text', value: title }],
  }
}

const documentToMdast = (document: ResumeDocument): Root => {
  const { header, sections } = document.content
  const children: Array<RootContent> = []

  // The name is the document's H1 whether or not it is set, so the file always
  // has the shape the parser expects and an empty resume is still editable.
  children.push({
    type: 'heading',
    depth: 1,
    children: inlineText(header.name),
  })

  if (header.headline !== undefined && header.headline.length > 0) {
    children.push(paragraph(header.headline))
  }

  for (const contact of header.contacts) {
    children.push({
      type: 'leafDirective',
      name: CONTACT_DIRECTIVE,
      attributes: attributes({
        icon: contact.icon?.name,
        weight: contact.icon?.weight,
        href: contact.href,
      }),
      children: inlineText(contact.label),
    })
  }

  for (const section of sections) {
    children.push(sectionHeading(section), ...section.blocks.map(blockNode))
  }

  return { type: 'root', children }
}

export const serializeDocument = (document: ResumeDocument): string =>
  toMarkdown(documentToMdast(document), WRITER)
