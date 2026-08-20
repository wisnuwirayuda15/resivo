import type {
  Block,
  DesignConfig,
  HeaderBlock,
  Section,
} from '@/features/resume/model/document'

/**
 * The contract between the paginator and a template.
 *
 * A template does not render "a resume" or even "a section" — it renders the
 * three things the paginated flow is made of: the header, a section's heading,
 * and one block. That decomposition is forced by pagination: a section's blocks
 * can land on different pages, so nothing may render a section as one box.
 */

export interface RenderContext {
  /** BCP 47 tag from the document's meta. Affects date formatting, not text. */
  locale: string
  /**
   * The resolved style tokens. Renderers read them only for decisions CSS cannot
   * express — whether a divider exists at all, for instance. Everything visual
   * comes through `--paper-*` custom properties instead, so the style panel can
   * change it without a re-render of this tree.
   */
  design: DesignConfig
}

export interface HeaderProps {
  header: HeaderBlock
  context: RenderContext
}

export interface SectionHeadingProps {
  section: Section
  context: RenderContext
}

export interface BlockProps {
  block: Block
  /** The section the block belongs to, for kind-dependent rendering. */
  section: Section
  context: RenderContext
}

export interface TemplateComponents {
  Header: React.FC<HeaderProps>
  SectionHeading: React.FC<SectionHeadingProps>
  Block: React.FC<BlockProps>
}
