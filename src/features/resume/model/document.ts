/**
 * The canonical resume document model — the single source of truth.
 *
 * Markdown editing, visual editing, template rendering and export all read and
 * write THIS tree. There is deliberately no second representation: the Markdown
 * editor is a projection produced by the codec, and the preview is a projection
 * produced by the renderer.
 *
 * Two rules make that work:
 *
 *  1. Every node carries a stable `id`, so drag-and-drop, undo/redo and diffing
 *     key off identity rather than array position.
 *  2. Rich text is a node array (`InlineText`), not a Markdown string and not
 *     React. That is what lets Markdown round-trip deterministically.
 *
 * Layering: `content` is portable and template-agnostic; `design` holds the
 * style tokens; `customCss` is opaque user text. A template decides how content
 * renders and never leaks into the content itself.
 */

/**
 * Bumped when the shape of a stored document changes. Records are migrated
 * lazily on read (see `database/migrations/documents.ts`), so a content change
 * never forces an IndexedDB schema migration.
 */
export const DOCUMENT_VERSION = 1

/** Paper baselines defined by the design system's `.resivo-paper` scopes. */
export const TEMPLATE_IDS = [
  'classic',
  'modern',
  'technical',
  'editorial',
] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

export const PAPER_SIZES = ['A4', 'Letter'] as const
export type PaperSize = (typeof PAPER_SIZES)[number]

// ---------------------------------------------------------------------------
// Rich inline text
// ---------------------------------------------------------------------------

export const MARKS = ['bold', 'italic', 'code', 'strike'] as const
export type Mark = (typeof MARKS)[number]

export type InlineNode =
  | { type: 'text'; text: string; marks?: Array<Mark> }
  | { type: 'link'; href: string; children: Array<InlineNode> }
  | { type: 'icon'; icon: IconRef }

/** A run of formatted text. Empty array is a valid, empty value. */
export type InlineText = Array<InlineNode>

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export const ICON_WEIGHTS = [
  'thin',
  'light',
  'regular',
  'bold',
  'fill',
  'duotone',
] as const
export type IconWeight = (typeof ICON_WEIGHTS)[number]

/**
 * A reference to an icon, never a component. `library` exists so custom SVGs or
 * another icon set can be added later without touching the document schema.
 */
export interface IconRef {
  library: 'phosphor'
  /** Phosphor icon name in kebab-case, e.g. `envelope-simple`. */
  name: string
  weight?: IconWeight
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export interface ParagraphBlock {
  id: string
  kind: 'paragraph'
  text: InlineText
}

export interface BulletListBlock {
  id: string
  kind: 'bulletList'
  items: Array<InlineText>
}

/**
 * One job, degree or project. The structured shape is what a heading-convention
 * Markdown parser could never recover reliably, which is why the codec emits a
 * directive for it.
 */
export interface EntryBlock {
  id: string
  kind: 'entry'
  /** Role, degree or project name. */
  title: InlineText
  /** Company, school or client. */
  subtitle?: InlineText
  location?: InlineText
  dateRange?: DateRange
  summary?: InlineText
  bullets: Array<InlineText>
}

export interface DateRange {
  /** ISO `YYYY-MM` where possible, free text otherwise. */
  start?: string
  end?: string
  /** When true the renderer prints "Present" and ignores `end`. */
  current?: boolean
}

/** Skills and similar chip lists. */
export interface TagListBlock {
  id: string
  kind: 'tagList'
  tags: Array<string>
}

export interface ImageBlock {
  id: string
  kind: 'image'
  /** Row id in the `images` table. The blob itself is never inlined here. */
  imageId: string
  alt: string
  /** Rendered width as a percentage of the content column. */
  widthPercent?: number
}

export interface DividerBlock {
  id: string
  kind: 'divider'
}

/** Icon paired with a label — contact rows, links, locations. */
export interface IconLabelBlock {
  id: string
  kind: 'iconLabel'
  icon: IconRef
  label: InlineText
}

/**
 * Escape hatch for Markdown this model does not represent (tables, raw HTML,
 * footnotes, code fences). The original source is kept verbatim so the
 * round-trip stays lossless; the preview renders it as preformatted text and
 * the editor shows a non-blocking warning. Never silently drop input.
 */
export interface RawBlock {
  id: string
  kind: 'raw'
  markdown: string
}

export type Block =
  | ParagraphBlock
  | BulletListBlock
  | EntryBlock
  | TagListBlock
  | ImageBlock
  | DividerBlock
  | IconLabelBlock
  | RawBlock

export type BlockKind = Block['kind']

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Known section kinds get template-specific rendering; `custom` is the fallback
 * for anything the user invents, and keeps its own title.
 */
export const SECTION_KINDS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'awards',
  'publications',
  'languages',
  'interests',
  'custom',
] as const
export type SectionKind = (typeof SECTION_KINDS)[number]

export interface SectionStyleOverride {
  /** Extra space above this section, in rem. Overrides `design.spacing.section`. */
  spaceBefore?: number
  showDivider?: boolean
  columns?: 1 | 2
}

export interface Section {
  id: string
  kind: SectionKind
  title: InlineText
  icon?: IconRef
  /** Hidden rather than deleted, so toggling it back is not an undo operation. */
  hidden?: boolean
  /** Ordered by array index. */
  blocks: Array<Block>
  style?: SectionStyleOverride
}

// ---------------------------------------------------------------------------
// Header + content
// ---------------------------------------------------------------------------

/**
 * The identity block at the top of every resume. Kept separate from `sections`
 * because it is not reorderable and every template renders it specially.
 */
export interface HeaderBlock {
  name: InlineText
  headline?: InlineText
  /** Contact rows — email, phone, links. Each may carry an icon. */
  contacts: Array<ContactItem>
  /** Row id in the `images` table. */
  avatarImageId?: string
}

export interface ContactItem {
  id: string
  icon?: IconRef
  label: InlineText
  /** Set when the item should render as a link. */
  href?: string
}

export interface ResumeContent {
  header: HeaderBlock
  /** Ordered by array index; drag-and-drop reorders this array. */
  sections: Array<Section>
}

// ---------------------------------------------------------------------------
// Design configuration (style tokens)
// ---------------------------------------------------------------------------

/** Edge lengths in inches, matching the design system's paper margin token. */
export interface BoxEdges {
  top: number
  right: number
  bottom: number
  left: number
}

export interface FontRef {
  /** CSS family name, e.g. `Source Serif 4 Variable`. */
  family: string
  source: 'builtin' | 'custom'
  /** Row id in the `fonts` table. Required when `source` is `custom`. */
  fontId?: string
}

/**
 * The user-editable style layer, written by the style panel and emitted as
 * `--paper-*` custom properties on the preview root. Structured on purpose:
 * arbitrary UI values must never be scattered through the document.
 */
export interface DesignConfig {
  paper: {
    size: PaperSize
    margin: BoxEdges
  }
  typography: {
    bodyFont: FontRef
    headingFont?: FontRef
    /** Body size in points — resumes are print documents, so pt not px. */
    baseSize: number
    /** Modular scale ratio used to derive heading sizes. */
    scale: number
    lineHeight: number
    weights: { body: number; heading: number }
  }
  colors: {
    text: string
    heading: string
    accent: string
    muted: string
    rule: string
  }
  /** Vertical rhythm, in rem. */
  spacing: {
    section: number
    paragraph: number
    heading: number
  }
  rules: {
    showDividers: boolean
    /** Rule thickness in px. */
    width: number
    color: string
  }
  image: {
    avatarShape: 'circle' | 'square' | 'rounded'
    /** Avatar edge length in px. */
    avatarSize: number
  }
  icons: {
    /** Icon size in px. */
    size: number
    color: string
    defaultWeight: IconWeight
  }
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * Denormalized fields, duplicated out of `content.header` so the resume list
 * can search and sort without parsing every document.
 */
export interface ResumeMeta {
  fullName: string
  headline?: string
  /** BCP 47 tag, e.g. `en`. Affects date formatting, not content. */
  locale: string
}

export interface ResumeDocument {
  schemaVersion: number
  templateId: TemplateId
  meta: ResumeMeta
  content: ResumeContent
  design: DesignConfig
  /** Raw user CSS. Sanitized and scoped at render time, never trusted. */
  customCss: string
}
