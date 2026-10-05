/**
 * The canonical resume document model, the single source of truth.
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
export const DOCUMENT_VERSION = 2;

/** Paper baselines defined by the design system's `.resivo-paper` scopes. */
export const TEMPLATE_IDS = [
  "classic",
  "modern",
  "technical",
  "editorial",
  "compact",
  "profile",
  "bold",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const PAPER_SIZES = ["A4", "Letter"] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

// ---------------------------------------------------------------------------
// Rich inline text
// ---------------------------------------------------------------------------

export const MARKS = ["bold", "italic", "code", "strike"] as const;
export type Mark = (typeof MARKS)[number];

export type InlineNode =
  | { type: "text"; text: string; marks?: Array<Mark> }
  | { type: "link"; href: string; children: Array<InlineNode> }
  | { type: "icon"; icon: IconRef };

/** A run of formatted text. Empty array is a valid, empty value. */
export type InlineText = Array<InlineNode>;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export const ICON_WEIGHTS = [
  "thin",
  "light",
  "regular",
  "bold",
  "fill",
  "duotone",
] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number];

/**
 * A reference to an icon, never a component. `library` exists so custom SVGs or
 * another icon set can be added later without touching the document schema.
 */
export interface IconRef {
  library: "phosphor";
  /** Phosphor icon name in kebab-case, e.g. `envelope-simple`. */
  name: string;
  weight?: IconWeight;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export interface ParagraphBlock {
  id: string;
  kind: "paragraph";
  text: InlineText;
}

/**
 * One item of a list.
 *
 * `list` is what makes nesting possible, and it holds a whole list rather than
 * just items so a bulleted list can contain a numbered one, which is exactly
 * what Markdown allows and what a flat `Array<InlineText>` could not express.
 */
export interface ListItem {
  text: InlineText;
  /** A GFM task list checkbox. Absent when the item is not one. */
  checked?: boolean;
  list?: NestedList;
}

export interface NestedList {
  ordered?: boolean;
  /** First number of an ordered list, when it is not 1. */
  start?: number;
  items: Array<ListItem>;
}

/**
 * A list. Bulleted by default, numbered when `ordered` is set.
 *
 * The kind is still `bulletList` because a list is a list, the marker is a
 * property of it, not a different kind of block, and templates that override
 * the renderer key off the kind.
 */
export interface BulletListBlock {
  id: string;
  kind: "bulletList";
  ordered?: boolean;
  start?: number;
  items: Array<ListItem>;
}

/**
 * A subheading inside a section.
 *
 * The level is the Markdown depth it is written at. Depth 2 is what opens a
 * section, so a heading block is always deeper than that, there is no level
 * that could be read back as a section boundary.
 */
export interface HeadingBlock {
  id: string;
  kind: "heading";
  level: 3 | 4 | 5 | 6;
  text: InlineText;
}

/** A block quote. One run per paragraph; a quote containing anything richer is
 * kept as a `raw` block instead, because the model has no nesting here. */
export interface QuoteBlock {
  id: string;
  kind: "quote";
  paragraphs: Array<InlineText>;
}

/**
 * A fenced code block.
 *
 * `code` is a plain string, not `InlineText`: everything inside a fence is
 * literal, so marks would be a lie about what the source says.
 */
export interface CodeBlock {
  id: string;
  kind: "code";
  language?: string;
  code: string;
}

export type TableAlign = "left" | "center" | "right";

/** A GFM table. The header row is separate because GFM always has exactly one
 * and every renderer treats it differently. */
export interface TableBlock {
  id: string;
  kind: "table";
  head: Array<InlineText>;
  rows: Array<Array<InlineText>>;
  /** Per column, `null` where the source gave no alignment. */
  align: Array<TableAlign | null>;
}

/**
 * One job, degree or project. The structured shape is what a heading-convention
 * Markdown parser could never recover reliably, which is why the codec emits a
 * directive for it.
 */
export interface EntryBlock {
  id: string;
  kind: "entry";
  /** Role, degree or project name. */
  title: InlineText;
  /** Company, school or client. */
  subtitle?: InlineText;
  location?: InlineText;
  dateRange?: DateRange;
  summary?: InlineText;
  bullets: Array<InlineText>;
}

export interface DateRange {
  /** ISO `YYYY-MM` where possible, free text otherwise. */
  start?: string;
  end?: string;
  /** When true the renderer prints "Present" and ignores `end`. */
  current?: boolean;
}

/** Skills and similar chip lists. */
export interface TagListBlock {
  id: string;
  kind: "tagList";
  tags: Array<string>;
}

export interface ImageBlock {
  id: string;
  kind: "image";
  /** Row id in the `images` table. The blob itself is never inlined here. */
  imageId: string;
  alt: string;
  /** Rendered width as a percentage of the content column. */
  widthPercent?: number;
}

export interface DividerBlock {
  id: string;
  kind: "divider";
}

/**
 * A forced page break.
 *
 * A block rather than a section flag, because a break belongs between two
 * particular things (half way down Experience, before the references), and only
 * a block can sit there. It renders as a zero-height marker, so the height the
 * paginator measures is the height the printer produces whether the marker is
 * drawn or not.
 */
export interface PageBreakBlock {
  id: string;
  kind: "pageBreak";
}

/** Icon paired with a label, contact rows, links, locations. */
export interface IconLabelBlock {
  id: string;
  kind: "iconLabel";
  icon: IconRef;
  label: InlineText;
}

/**
 * Escape hatch for Markdown this model does not represent, raw HTML,
 * footnotes, definitions. The original source is kept verbatim so the
 * round-trip stays lossless; the preview renders it as preformatted text and
 * the editor shows a non-blocking warning. Never silently drop input.
 */
export interface RawBlock {
  id: string;
  kind: "raw";
  markdown: string;
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | BulletListBlock
  | QuoteBlock
  | CodeBlock
  | TableBlock
  | EntryBlock
  | TagListBlock
  | ImageBlock
  | DividerBlock
  | PageBreakBlock
  | IconLabelBlock
  | RawBlock;

export type BlockKind = Block["kind"];

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Known section kinds get template-specific rendering; `custom` is the fallback
 * for anything the user invents, and keeps its own title.
 */
export const SECTION_KINDS = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "awards",
  "publications",
  "languages",
  "interests",
  "custom",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export interface SectionStyleOverride {
  /** Extra space above this section, in rem. Overrides `design.spacing.section`. */
  spaceBefore?: number;
  showDivider?: boolean;
  columns?: 1 | 2;
  /**
   * `page` starts the section on a fresh sheet. Absent and `auto` both mean
   * "wherever it falls", which is the default a resume wants, a forced break is
   * a decision about one section, not a habit.
   */
  breakBefore?: "auto" | "page";
}

export interface Section {
  id: string;
  kind: SectionKind;
  title: InlineText;
  icon?: IconRef;
  /** Hidden rather than deleted, so toggling it back is not an undo operation. */
  hidden?: boolean;
  /** Ordered by array index. */
  blocks: Array<Block>;
  style?: SectionStyleOverride;
}

// ---------------------------------------------------------------------------
// Header + content
// ---------------------------------------------------------------------------

/**
 * The identity block at the top of every resume. Kept separate from `sections`
 * because it is not reorderable and every template renders it specially.
 */
export interface HeaderBlock {
  name: InlineText;
  headline?: InlineText;
  /** Contact rows, email, phone, links. Each may carry an icon. */
  contacts: Array<ContactItem>;
  /** Row id in the `images` table. */
  avatarImageId?: string;
}

export interface ContactItem {
  id: string;
  icon?: IconRef;
  label: InlineText;
  /** Set when the item should render as a link. */
  href?: string;
}

export interface ResumeContent {
  header: HeaderBlock;
  /** Ordered by array index; drag-and-drop reorders this array. */
  sections: Array<Section>;
}

// ---------------------------------------------------------------------------
// Design configuration (style tokens)
// ---------------------------------------------------------------------------

/** Edge lengths in inches, matching the design system's paper margin token. */
export interface BoxEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** How body text sits in its column. */
export const TEXT_ALIGNMENTS = ["left", "center", "right", "justify"] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

/** The longest tag separator the Style tab accepts, in characters. A separator
 * is a mark between two keywords, and anything longer is a phrase. */
export const TAG_SEPARATOR_MAX = 8;

export interface FontRef {
  /** CSS family name, e.g. `Source Serif 4 Variable`. */
  family: string;
  source: "builtin" | "custom";
  /** Row id in the `fonts` table. Required when `source` is `custom`. */
  fontId?: string;
}

/**
 * The user-editable style layer, written by the style panel and emitted as
 * `--paper-*` custom properties on the preview root. Structured on purpose:
 * arbitrary UI values must never be scattered through the document.
 */
export interface DesignConfig {
  paper: {
    size: PaperSize;
    margin: BoxEdges;
  };
  typography: {
    bodyFont: FontRef;
    headingFont?: FontRef;
    /** Body size in points, resumes are print documents, so pt not px. */
    baseSize: number;
    /** Modular scale ratio used to derive heading sizes. */
    scale: number;
    lineHeight: number;
    weights: { body: number; heading: number };
  };
  colors: {
    text: string;
    heading: string;
    accent: string;
    muted: string;
    rule: string;
  };
  /** Vertical rhythm, in rem. */
  spacing: {
    section: number;
    paragraph: number;
    heading: number;
  };
  rules: {
    showDividers: boolean;
    /** Rule thickness in px. */
    width: number;
    color: string;
  };
  image: {
    avatarShape: "circle" | "square" | "rounded";
    /** Avatar edge length in px. */
    avatarSize: number;
  };
  icons: {
    /** Icon size in px. */
    size: number;
    color: string;
    defaultWeight: IconWeight;
  };
  /**
   * Body text and tag lists. Optional for the reason `pagination` is: a document
   * written before these existed has no such field, and its absence has to mean
   * the template's own look (inherited alignment, a middle dot) rather than
   * making an old document invalid.
   */
  text?: {
    /** Paragraphs, summaries, bullets and quotes. Headings, dates and the
     * header keep the template's own alignment. */
    align?: TextAlignment;
    /** Printed between two tags. An empty string is a valid choice (a gap and no
     * mark), which is why absence and `""` are different. */
    tagSeparator?: string;
  };
  /**
   * How pagination behaves. Optional because documents written before it
   * existed have no such field, and its absence has to mean the default rather
   * than making an old document invalid.
   */
  pagination?: {
    /**
     * Whether a section heading is forbidden from being the last thing on a
     * page. On by default: a heading stranded at the foot of a page is the one
     * break every reader notices. Off packs the pages tighter.
     */
    keepHeadingWithContent?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * Denormalized fields, duplicated out of `content.header` so the resume list
 * can search and sort without parsing every document.
 */
export interface ResumeMeta {
  fullName: string;
  headline?: string;
  /** BCP 47 tag, e.g. `en`. Affects date formatting, not content. */
  locale: string;
}

/**
 * What a document is. A cover letter is the same thing as a resume to everything
 * that stores, edits, paginates and exports one (same table, same route, same
 * editor, same pipeline) and differs in four places that read this field: the
 * flow leaves out section headings, the design defaults are a letter's, the ATS
 * check asks different questions, and the library files it separately.
 */
export const DOCUMENT_KINDS = ["resume", "coverLetter"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface ResumeDocument {
  schemaVersion: number;
  /**
   * Absent means `resume`, which is every document written before this field
   * existed. Optional rather than defaulted by a migration so those rows stay
   * valid as they are and nothing needs a version bump; read it as
   * `kind ?? "resume"`.
   */
  kind?: DocumentKind;
  templateId: TemplateId;
  meta: ResumeMeta;
  content: ResumeContent;
  design: DesignConfig;
  /** Raw user CSS. Sanitized and scoped at render time, never trusted. */
  customCss: string;
}
