import { Fragment } from 'react'

import { DocumentIcon } from '@/features/icons/IconRenderer'

import type { InlineNode, InlineText, Mark } from '@/features/resume/model/document'

/**
 * Renders the document's rich inline text.
 *
 * `InlineText` is a node array rather than a Markdown string, which is what
 * makes the Markdown round-trip deterministic — and it means this renderer is
 * the only thing that decides how a mark looks. Nothing here parses; it maps.
 */

/**
 * Marks nest in this order, outermost first.
 *
 * Fixed rather than derived from the order the marks happen to appear in the
 * document, so the same set of marks always produces the same DOM. That matters
 * more than it sounds: unstable nesting would change the rendered box tree,
 * which would change measured heights, which would move page breaks.
 */
const MARK_ORDER: Array<Mark> = ['strike', 'code', 'italic', 'bold']

const wrapMark = (mark: Mark, children: React.ReactNode): React.ReactNode => {
  switch (mark) {
    case 'bold':
      return <strong className="rp-strong">{children}</strong>
    case 'italic':
      return <em>{children}</em>
    case 'code':
      return <code className="rp-code">{children}</code>
    case 'strike':
      return <s>{children}</s>
  }
}

const InlineNodeView: React.FC<{ node: InlineNode }> = ({ node }) => {
  switch (node.type) {
    case 'text': {
      const marks = node.marks ?? []

      return (
        <>
          {MARK_ORDER.filter((mark) => marks.includes(mark)).reduceRight<React.ReactNode>(
            (children, mark) => wrapMark(mark, children),
            node.text,
          )}
        </>
      )
    }

    case 'link':
      /**
       * `rel` is set even though the preview never navigates: the same markup is
       * what the HTML export ships, and that file is opened in a real browser
       * by whoever receives it.
       */
      return (
        <a
          className="rp-link"
          href={node.href}
          rel="noreferrer noopener"
          target="_blank"
        >
          <InlineTextView value={node.children} />
        </a>
      )

    case 'icon':
      return <DocumentIcon icon={node.icon} />
  }
}

/**
 * Keyed by index, which is safe here and nowhere else in this codebase: an
 * inline run is replaced wholesale on every edit rather than reordered, so there
 * is no identity to preserve across renders.
 */
export const InlineTextView: React.FC<{ value: InlineText }> = ({ value }) => (
  <>
    {value.map((node, index) => (
      <Fragment key={index}>
        <InlineNodeView node={node} />
      </Fragment>
    ))}
  </>
)
