import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { createId } from '@/lib/id'
import { plainText, syncMeta } from '@/features/resume/model/index'

import {
  CONTACT_DIRECTIVE,
  ENTRY_DIRECTIVE,
  ICON_DIRECTIVE,
  IMAGE_DIRECTIVE,
  PAGE_BREAK_DIRECTIVE,
  LABEL_DIRECTIVE,
  TAGS_DIRECTIVE,
  sectionKindFromTitle,
} from './spec'

import type { RootContent } from 'mdast'
import type {
  Block,
  BlockKind,
  ContactItem,
  DateRange,
  IconRef,
  IconWeight,
  InlineText,
  ListItem,
  Mark,
  NestedList,
  ResumeContent,
  ResumeDocument,
  Section,
  TableAlign,
} from '@/features/resume/model/document'

/**
 * Resivo-Markdown into the document model.
 *
 * Two things make this more than a tree walk.
 *
 * **Nothing is dropped.** Almost all of CommonMark and GFM has a block in the
 * model (headings, lists of either kind at any depth, task lists, quotes,
 * fences, tables. What is left is raw HTML, footnotes and link definitions, and
 * each of those becomes a `raw` block holding its exact source text, reported as
 * a warning rather than an error. Content that arrives before any heading opens
 * an untitled section rather than being refused: the editor's buffer is a
 * serialization of this model, so anything the model will not hold is erased
 * from the user's file, not merely left unrendered.
 *
 * **Ids are reused.** A parse is almost always a reparse of a document that is
 * already open, so creating fresh ids each keystroke would break undo
 * coalescing, restart every animation, and make autosave write a wholly new
 * tree for a one-character edit. Each section and block is therefore matched
 * back to the one it came from, which is also how the three fields with no
 * Markdown syntax, a section's `hidden` flag, its icon and its style override,
 * survive the trip.
 */

export interface ParseWarning {
  /** 1-based, as editors count. */
  line: number
  column: number
  message: string
}

export interface ParseResult {
  content: ResumeContent
  warnings: Array<ParseWarning>
}

/**
 * A block before it is given an id.
 *
 * Written as a mapped type rather than `Omit<Block, 'id'>`, because `Omit` over
 * a union keeps only the keys every member shares, which would be `kind` alone,
 * and would quietly accept a paragraph with an image's fields.
 */
type BlockDraft = {
  [K in BlockKind]: Omit<Extract<Block, { kind: K }>, 'id'>
}[BlockKind]

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective)

// ---------------------------------------------------------------------------
// Directive attributes
// ---------------------------------------------------------------------------

type Attributes = Record<string, string | null | undefined>

const attribute = (
  attributes: Attributes | null | undefined,
  name: string,
): string | undefined => {
  const value = attributes?.[name]

  return value === null || value === undefined || value === ''
    ? undefined
    : value
}

const ICON_WEIGHTS: Array<IconWeight> = [
  'thin',
  'light',
  'regular',
  'bold',
  'fill',
  'duotone',
]

/** Builds an icon reference, ignoring a weight this build does not know rather
 * than storing one the schema would later reject. */
const iconRef = (
  name: string | undefined,
  weight: string | undefined,
): IconRef | undefined => {
  if (name === undefined) {
    return undefined
  }

  const known = ICON_WEIGHTS.find((candidate) => candidate === weight)

  return {
    library: 'phosphor',
    name,
    ...(known === undefined ? {} : { weight: known }),
  }
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

const withMark = (text: InlineText, mark: Mark): InlineText =>
  text.map((node) =>
    node.type === 'text'
      ? {
          ...node,
          marks: [...new Set([...(node.marks ?? []), mark])],
        }
      : node,
  )

/**
 * Merges adjacent runs that ended up with the same marks.
 *
 * `**a**b` parses as two nodes and would stay two nodes, which is harmless until
 * something compares documents for equality, then a reparse of unchanged text
 * looks like an edit. Normalising here keeps the model canonical.
 */
const collapse = (text: InlineText): InlineText => {
  const out: InlineText = []

  for (const node of text) {
    const previous = out[out.length - 1]

    if (
      node.type === 'text' &&
      previous?.type === 'text' &&
      sameMarks(previous.marks, node.marks)
    ) {
      out[out.length - 1] = { ...previous, text: previous.text + node.text }
      continue
    }

    out.push(node)
  }

  // An empty run and a run of empty strings mean the same thing; the model's
  // canonical form is the empty array.
  return out.filter((node) => node.type !== 'text' || node.text !== '')
}

const sameMarks = (
  left: Array<Mark> | undefined,
  right: Array<Mark> | undefined,
): boolean => {
  const a = [...(left ?? [])].sort()
  const b = [...(right ?? [])].sort()

  return a.length === b.length && a.every((mark, index) => mark === b[index])
}

/** `phrasing` is widened to `unknown` because directive nodes are added to the
 * mdast tree by a plugin and are not in the base content union. */
const inlineFrom = (nodes: Array<unknown>): InlineText =>
  collapse(nodes.flatMap((node) => inlineNode(node)))

const inlineNode = (node: unknown): InlineText => {
  const typed = node as {
    type: string
    value?: string
    url?: string
    name?: string
    attributes?: Attributes
    children?: Array<unknown>
  }

  switch (typed.type) {
    case 'text':
      return [{ type: 'text', text: typed.value ?? '' }]

    case 'inlineCode':
      return [{ type: 'text', text: typed.value ?? '', marks: ['code'] }]

    case 'strong':
      return withMark(inlineFrom(typed.children ?? []), 'bold')

    case 'emphasis':
      return withMark(inlineFrom(typed.children ?? []), 'italic')

    case 'delete':
      return withMark(inlineFrom(typed.children ?? []), 'strike')

    /**
     * GFM turns a bare email or URL into a link node without any `[…]` in the
     * source. Keeping it as a link would make the round trip asymmetric: the
     * serializer writes `[text](href)`, which reads back as a genuine link, so
     * every save would add brackets the user never typed. An autolink is
     * detected by position (its first child starts exactly where the node does,
     * because there is no opening bracket to skip), and kept as text.
     */
    case 'link': {
      const child = (typed.children ?? [])[0] as
        { position?: { start: { offset?: number } } } | undefined
      const nodeStart = (typed as { position?: { start: { offset?: number } } })
        .position?.start.offset
      const childStart = child?.position?.start.offset

      if (
        nodeStart !== undefined &&
        childStart !== undefined &&
        nodeStart === childStart
      ) {
        return inlineFrom(typed.children ?? [])
      }

      return [
        {
          type: 'link',
          href: typed.url ?? '',
          children: inlineFrom(typed.children ?? []),
        },
      ]
    }

    // A hard or soft break inside a paragraph becomes a space: the model has no
    // line-break node, and a resume's paragraph is a paragraph.
    case 'break':
      return [{ type: 'text', text: ' ' }]

    case 'textDirective': {
      if (typed.name === ICON_DIRECTIVE) {
        const icon = iconRef(
          attribute(typed.attributes, 'name'),
          attribute(typed.attributes, 'weight'),
        )

        if (icon !== undefined) {
          return [{ type: 'icon', icon }]
        }
      }

      // An unknown inline directive is kept as the text it looked like, so
      // nothing the user typed disappears.
      return [{ type: 'text', text: `:${typed.name ?? ''}` }]
    }

    // Inline HTML and anything else phrasing: keep the literal characters.
    default:
      return typed.value !== undefined
        ? [{ type: 'text', text: typed.value }]
        : inlineFrom(typed.children ?? [])
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

interface ParsedBlock {
  block: BlockDraft
  warning?: string
}

const slice = (source: string, node: RootContent | unknown): string => {
  const position = (
    node as {
      position?: { start?: { offset?: number }; end?: { offset?: number } }
    }
  ).position

  const start = position?.start?.offset
  const end = position?.end?.offset

  return start === undefined || end === undefined
    ? ''
    : source.slice(start, end)
}

const dateRange = (
  attributes: Attributes | null | undefined,
): DateRange | undefined => {
  const start = attribute(attributes, 'start')
  const end = attribute(attributes, 'end')
  const current = attribute(attributes, 'current')

  if (start === undefined && end === undefined && current === undefined) {
    return undefined
  }

  return {
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
    // `{current}` with no value is how a reader would write a flag, so its mere
    // presence counts; only an explicit "false" turns it off.
    ...(current === undefined || current === 'false' ? {} : { current: true }),
  }
}

/** The text of a directive's `[label]`, which mdast puts in its children. */
const directiveLabel = (node: { children?: Array<unknown> }): InlineText =>
  inlineFrom(node.children ?? [])

interface MdastList {
  ordered?: boolean | null
  start?: number | null
  children?: Array<{ checked?: boolean | null; children?: Array<unknown> }>
}

/**
 * A list, with its nesting kept.
 *
 * An item's own text lives in a paragraph; a list inside it is a sublist, and
 * anything else (a fence, a quote) is flattened into the item's text, because
 * an item in this model holds one run and one sublist. That is the only lossy
 * corner left in list handling, and it is reported by the caller.
 */
const listItems = (node: MdastList): Array<ListItem> =>
  (node.children ?? []).map((item) => {
    const phrasing: Array<unknown> = []
    let nested: NestedList | undefined

    for (const child of item.children ?? []) {
      const typed = child as { type: string; children?: Array<unknown> }

      if (typed.type === 'paragraph') {
        phrasing.push(...(typed.children ?? []))
        continue
      }

      if (typed.type === 'list') {
        const sublist = listOf(typed as MdastList)

        // A second sublist in one item is appended to the first: the model has
        // one nesting slot, and merging keeps every item rather than dropping
        // the ones that did not fit.
        nested =
          nested === undefined
            ? sublist
            : { ...nested, items: [...nested.items, ...sublist.items] }
        continue
      }

      phrasing.push(child)
    }

    return {
      text: inlineFrom(phrasing),
      ...(typeof item.checked === 'boolean' ? { checked: item.checked } : {}),
      ...(nested === undefined ? {} : { list: nested }),
    }
  })

/** A list's own properties. `start` is written only when it is not the default,
 * so an ordinary list serializes to the same bytes it was read from. */
const listOf = (node: MdastList): NestedList => ({
  ...(node.ordered === true ? { ordered: true } : {}),
  ...(node.ordered === true &&
  typeof node.start === 'number' &&
  node.start !== 1
    ? { start: node.start }
    : {}),
  items: listItems(node),
})

const TABLE_ALIGN: Array<TableAlign> = ['left', 'center', 'right']

const tableBlock = (node: {
  align?: Array<string | null | undefined> | null
  children?: Array<{ children?: Array<{ children?: Array<unknown> }> }>
}): BlockDraft => {
  const rows = (node.children ?? []).map((row) =>
    (row.children ?? []).map((cell) => inlineFrom(cell.children ?? [])),
  )
  const [head = [], ...body] = rows

  return {
    kind: 'table',
    head,
    rows: body,
    align: (node.align ?? []).map(
      (value) => TABLE_ALIGN.find((known) => known === value) ?? null,
    ),
  }
}

/** Paragraphs only. A quote holding a list or a fence has no shape in the model,
 * so the caller keeps the whole quote as source text instead. */
const quoteParagraphs = (node: {
  children?: Array<unknown>
}): Array<InlineText> | undefined => {
  const paragraphs: Array<InlineText> = []

  for (const child of node.children ?? []) {
    const typed = child as { type: string; children?: Array<unknown> }

    if (typed.type !== 'paragraph') {
      return undefined
    }

    paragraphs.push(inlineFrom(typed.children ?? []))
  }

  return paragraphs
}

/**
 * An entry's bullets are a flat array of runs, so a sublist inside one is
 * levelled into further bullets. Every item's text survives; only its
 * indentation does not, and a nested list inside a `:::entry` is something only
 * this format's own syntax could produce.
 */
const flattenItems = (items: Array<ListItem>): Array<InlineText> =>
  items.flatMap((item) => [item.text, ...flattenItems(item.list?.items ?? [])])

const entryBullets = (node: MdastList): Array<InlineText> =>
  flattenItems(listItems(node))

const entryBlock = (node: {
  attributes?: Attributes
  children?: Array<unknown>
}): BlockDraft => {
  const children = node.children ?? []
  const paragraphs: Array<InlineText> = []
  const bullets: Array<InlineText> = []

  for (const child of children) {
    const typed = child as { type: string; children?: Array<unknown> }

    if (typed.type === 'paragraph') {
      paragraphs.push(inlineFrom(typed.children ?? []))
    } else if (typed.type === 'list') {
      bullets.push(...entryBullets(typed as MdastList))
    }
  }

  const subtitle = attribute(node.attributes, 'subtitle')
  const location = attribute(node.attributes, 'location')
  const range = dateRange(node.attributes)
  const summary = paragraphs[0]

  return {
    kind: 'entry',
    title: inlineText(attribute(node.attributes, 'title')),
    ...(subtitle === undefined ? {} : { subtitle: inlineText(subtitle) }),
    ...(location === undefined ? {} : { location: inlineText(location) }),
    ...(range === undefined ? {} : { dateRange: range }),
    ...(summary === undefined || summary.length === 0 ? {} : { summary }),
    bullets,
  }
}

/**
 * A directive attribute holding text.
 *
 * Attributes are plain strings in the source, so any markup inside one is not
 * markup, an entry title of `**Lead**` is a title containing asterisks. Parsing
 * it would make the round trip asymmetric, since the serializer writes the
 * attribute escaped.
 */
const inlineText = (value: string | undefined): InlineText =>
  value === undefined || value === '' ? [] : [{ type: 'text', text: value }]

const RAW_REASONS: Record<string, string> = {
  html: 'Raw HTML is kept as source text and never rendered.',
  footnoteDefinition: 'Footnotes are kept as source text and printed as-is.',
  definition: 'Link definitions are kept as source text and printed as-is.',
}

/**
 * One block, given the heading depth that opens a section.
 *
 * The depth matters here for one node type: a heading deeper than a section's is
 * a subheading of it, and there is no other level a heading can be at by the
 * time this is called.
 */
const blockFrom = (
  node: RootContent,
  source: string,
  sectionDepth: number,
): ParsedBlock => {
  const typed = node as RootContent & {
    name?: string
    attributes?: Attributes
    depth?: number
    lang?: string | null
    value?: string
    ordered?: boolean
    children?: Array<unknown>
  }

  switch (typed.type) {
    case 'paragraph':
      return {
        block: { kind: 'paragraph', text: inlineFrom(typed.children) },
      }

    case 'thematicBreak':
      return { block: { kind: 'divider' } }

    case 'heading': {
      const depth = typed.depth

      // Clamped, not rejected. A heading below a section can only be deeper
      // than it, and Markdown stops at six, so this is arithmetic rather than
      // a decision, and the clamp is what makes the type honest.
      const level = Math.min(6, Math.max(3, depth, sectionDepth + 1)) as
        3 | 4 | 5 | 6

      return {
        block: { kind: 'heading', level, text: inlineFrom(typed.children) },
      }
    }

    case 'list': {
      const list = listOf(typed)

      return { block: { kind: 'bulletList', ...list } }
    }

    case 'code':
      return {
        block: {
          kind: 'code',
          ...(typed.lang === null ||
          typed.lang === undefined ||
          typed.lang === ''
            ? {}
            : { language: typed.lang }),
          code: typed.value,
        },
      }

    case 'table':
      return {
        block: tableBlock(typed),
      }

    case 'blockquote': {
      const paragraphs = quoteParagraphs(typed)

      return paragraphs === undefined
        ? {
            block: { kind: 'raw', markdown: slice(source, node) },
            warning:
              'A quote containing anything but paragraphs is kept as source text.',
          }
        : { block: { kind: 'quote', paragraphs } }
    }

    case 'containerDirective':
      if (typed.name === ENTRY_DIRECTIVE) {
        return { block: entryBlock(typed) }
      }

      return {
        block: { kind: 'raw', markdown: slice(source, node) },
        warning: `":::${typed.name}" is not a block this build knows.`,
      }

    case 'leafDirective': {
      if (typed.name === TAGS_DIRECTIVE) {
        return {
          block: {
            kind: 'tagList',
            tags: plainText(directiveLabel(typed))
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag !== ''),
          },
        }
      }

      if (typed.name === LABEL_DIRECTIVE) {
        const icon = iconRef(
          attribute(typed.attributes, 'icon'),
          attribute(typed.attributes, 'weight'),
        )

        if (icon !== undefined) {
          return {
            block: { kind: 'iconLabel', icon, label: directiveLabel(typed) },
          }
        }
      }

      if (typed.name === PAGE_BREAK_DIRECTIVE) {
        return { block: { kind: 'pageBreak' } }
      }

      if (typed.name === IMAGE_DIRECTIVE) {
        const imageId = attribute(typed.attributes, 'id')
        const width = Number(attribute(typed.attributes, 'width'))

        if (imageId !== undefined) {
          return {
            block: {
              kind: 'image',
              imageId,
              alt: plainText(directiveLabel(typed)),
              ...(Number.isFinite(width) && width > 0
                ? { widthPercent: width }
                : {}),
            },
          }
        }
      }

      return {
        block: { kind: 'raw', markdown: slice(source, node) },
        warning: `"::${typed.name}" is not a block this build knows.`,
      }
    }

    default:
      return {
        block: { kind: 'raw', markdown: slice(source, node) },
        warning:
          RAW_REASONS[typed.type] ??
          'This is kept as source text and printed as-is.',
      }
  }
}

// ---------------------------------------------------------------------------
// Id reuse
// ---------------------------------------------------------------------------

/**
 * Hands back the id of the section this one used to be, along with the fields
 * that have no written form.
 *
 * Matching prefers an unused previous section with the same heading, and falls
 * back to the next unused one in order, which is what makes renaming a heading
 * keep its identity, and inserting a section above another not renumber
 * everything below it.
 */
const sectionMatcher = (previous: ResumeDocument | undefined) => {
  const available = [...(previous?.content.sections ?? [])]

  return (title: string): Section | undefined => {
    const byTitle = available.findIndex(
      (section) => plainText(section.title) === title,
    )
    const index = byTitle === -1 ? 0 : byTitle

    if (available.length === 0) {
      return undefined
    }

    const [matched] = available.splice(index, 1)

    return matched
  }
}

/** Same idea one level down: a block keeps its id if a block of the same kind
 * was in the same place before. */
const blockMatcher = (section: Section | undefined) => {
  const available = [...(section?.blocks ?? [])]

  return (kind: BlockKind): string | undefined => {
    const index = available.findIndex((block) => block.kind === kind)

    if (index === -1) {
      return undefined
    }

    const [matched] = available.splice(index, 1)

    return matched?.id
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

interface OpenSection {
  section: Section
  matchBlock: (kind: BlockKind) => string | undefined
}

const position = (node: RootContent): { line: number; column: number } => ({
  line: node.position?.start.line ?? 1,
  column: node.position?.start.column ?? 1,
})

/**
 * The heading depth that opens a section: the shallowest one below the name.
 *
 * One rule instead of a fixed `##`, because a resume written elsewhere and
 * pasted in is as likely to use `###` for its sections as `##`, and a document
 * whose every heading is one level too deep would otherwise have no sections at
 * all. Taking the shallowest present is deterministic (it never depends on
 * where in the file the parser has got to), and it agrees with `##` for every
 * document this app writes, because the serializer always emits `##`.
 */
const sectionDepthOf = (children: Array<RootContent>): number => {
  let shallowest: number | undefined

  for (const node of children) {
    if (node.type === 'heading' && node.depth >= 2) {
      shallowest =
        shallowest === undefined ? node.depth : Math.min(shallowest, node.depth)
    }
  }

  return shallowest ?? 2
}

export const parseDocument = (
  source: string,
  previous?: ResumeDocument,
): ParseResult => {
  const root = processor.parse(source)
  const warnings: Array<ParseWarning> = []
  const sectionDepth = sectionDepthOf(root.children)

  const matchSection = sectionMatcher(previous)
  const previousContacts = [...(previous?.content.header.contacts ?? [])]

  let name: InlineText = []
  let headline: InlineText | undefined
  const contacts: Array<ContactItem> = []
  const sections: Array<Section> = []

  /** The section blocks are currently being added to. */
  let open: OpenSection | undefined
  let seenHeading = false

  /**
   * Opens an untitled section for content that arrived before any heading.
   *
   * The alternative (warn and drop) is what this used to do, and it lost text
   * the user had typed: the editor's buffer is replaced by a serialization of
   * the model, so anything the model does not hold is erased from the file too.
   * An untitled section holds it, renders it without a heading, and writes it
   * back out.
   */
  const openSection = (title: InlineText): OpenSection => {
    const matched = matchSection(plainText(title))

    const section: Section = {
      id: matched?.id ?? createId(),
      kind: matched?.kind ?? sectionKindFromTitle(plainText(title)),
      title,
      blocks: [],
      // Carried across because Markdown has no syntax for any of them. This is
      // the whole reason matching exists.
      ...(matched?.hidden === true ? { hidden: true } : {}),
      ...(matched?.icon === undefined ? {} : { icon: matched.icon }),
      ...(matched?.style === undefined ? {} : { style: matched.style }),
    }

    sections.push(section)
    open = { section, matchBlock: blockMatcher(matched) }

    return open
  }

  const push = (node: RootContent) => {
    const { block, warning } = blockFrom(node, source, sectionDepth)

    if (warning !== undefined) {
      warnings.push({ ...position(node), message: warning })
    }

    const target = open ?? openSection([])

    target.section.blocks.push({
      id: target.matchBlock(block.kind) ?? createId(),
      ...block,
    })
  }

  for (const node of root.children) {
    if (node.type === 'heading' && node.depth === 1) {
      if (seenHeading) {
        // A second H1 is a mistake rather than a feature; keeping it as content
        // is better than merging two names.
        push(node)
        continue
      }

      name = inlineFrom(node.children)
      seenHeading = true
      continue
    }

    if (node.type === 'heading' && node.depth === sectionDepth) {
      openSection(inlineFrom(node.children))
      continue
    }

    // The header block: everything between the H1 and the first "##".
    if (open === undefined && seenHeading) {
      if (node.type === 'leafDirective' && node.name === CONTACT_DIRECTIVE) {
        const attributes = node.attributes as Attributes | undefined
        const href = attribute(attributes, 'href')
        const icon = iconRef(
          attribute(attributes, 'icon'),
          attribute(attributes, 'weight'),
        )
        const label = inlineFrom(node.children)
        const reused = previousContacts.shift()

        contacts.push({
          id: reused?.id ?? createId(),
          label,
          ...(icon === undefined ? {} : { icon }),
          ...(href === undefined ? {} : { href }),
        })
        continue
      }

      if (node.type === 'paragraph' && headline === undefined) {
        headline = inlineFrom(node.children)
        continue
      }
    }

    push(node)
  }

  return {
    content: {
      header: {
        name,
        ...(headline === undefined || headline.length === 0
          ? {}
          : { headline }),
        contacts,
        // No syntax, so carried across like the section fields above.
        ...(previous?.content.header.avatarImageId === undefined
          ? {}
          : { avatarImageId: previous.content.header.avatarImageId }),
      },
      sections,
    },
    warnings,
  }
}

/**
 * The whole round trip in one call: source in, a document ready for the store
 * out, with `meta` refreshed because the name may have changed.
 */
export const applyMarkdown = (
  document: ResumeDocument,
  source: string,
): { document: ResumeDocument; warnings: Array<ParseWarning> } => {
  const { content, warnings } = parseDocument(source, document)

  return { document: syncMeta({ ...document, content }), warnings }
}
