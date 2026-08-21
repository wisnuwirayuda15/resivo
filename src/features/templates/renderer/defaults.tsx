import { DocumentIcon } from '@/features/icons/IconRenderer'

import { InlineTextView } from './inline'
import { formatDateRange } from './dates'

import type {
  BlockProps,
  HeaderProps,
  RenderContext,
  SectionHeadingProps,
  TemplateComponents,
} from './types'
import type {
  BulletListBlock,
  DividerBlock,
  EntryBlock,
  IconLabelBlock,
  ImageBlock,
  ParagraphBlock,
  RawBlock,
  TagListBlock,
} from '@/features/resume/model/document'

/**
 * The default renderers — the resume every template starts from.
 *
 * A template supplies only the pieces it wants to change; `resolveTemplate`
 * fills the rest from here. Almost all visual difference between templates is
 * carried by CSS tokens rather than by markup, which is what keeps four
 * templates from becoming four renderers to keep in sync.
 *
 * Plain elements and `rp-` class names throughout, never `Box`/`Text` or a
 * Tailwind utility: this markup is serialised into the iframe and, later, into
 * the HTML export, neither of which carries the app's stylesheets. The one
 * inline style is an image's width, which is a per-block value from the
 * document.
 */

const DefaultHeader: React.FC<HeaderProps> = ({ header, context }) => {
  const avatar =
    header.avatarImageId === undefined
      ? undefined
      : context.images.get(header.avatarImageId)

  return (
    <header className="rp-header">
      {/**
       * Rendered only once the blob resolves, and never as a reserved box. The
       * avatar's size is a style token, so an empty box of exactly that size
       * would be indistinguishable from a photograph that failed — and drawing
       * nothing costs nothing here, because the flex row simply closes up and
       * re-opens when the image arrives, which re-paginates anyway.
       */}
      {avatar === undefined || avatar === null ? null : (
        <img alt="" className="rp-avatar" src={avatar.url} />
      )}

      <div className="rp-header-text">
        <div className="rp-name">
          <InlineTextView value={header.name} />
        </div>

        {header.headline === undefined ? null : (
          <div className="rp-headline">
            <InlineTextView value={header.headline} />
          </div>
        )}

        {header.contacts.length === 0 ? null : (
          <div className="rp-contacts">
            {header.contacts.map((contact) => {
              const label = (
                <>
                  {contact.icon === undefined ? null : (
                    <DocumentIcon icon={contact.icon} />
                  )}
                  <span>
                    <InlineTextView value={contact.label} />
                  </span>
                </>
              )

              return (
                <span className="rp-contact" key={contact.id}>
                  {contact.href === undefined ? (
                    label
                  ) : (
                    <a
                      className="rp-link"
                      href={contact.href}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {label}
                    </a>
                  )}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * A section's heading, and the rule under it.
 *
 * The rule is a token decision (`design.rules.showDividers`) rather than a
 * per-template one, because a user who turns dividers off expects them off in
 * every template.
 */
const DefaultSectionHeading: React.FC<SectionHeadingProps> = ({
  section,
  context,
}) => (
  <div className="rp-section">
    <div className="rp-section-title-row">
      {section.icon === undefined ? null : <DocumentIcon icon={section.icon} />}
      <h2 className="rp-section-title">
        <InlineTextView value={section.title} />
      </h2>
    </div>

    {(section.style?.showDivider ?? context.design.rules.showDividers) ? (
      <div className="rp-section-rule" />
    ) : null}
  </div>
)

const Paragraph: React.FC<{ block: ParagraphBlock }> = ({ block }) => (
  <p>
    <InlineTextView value={block.text} />
  </p>
)

const BulletList: React.FC<{ block: BulletListBlock }> = ({ block }) => (
  <ul className="rp-bullets">
    {block.items.map((item, index) => (
      // Bullet items carry no id in the model — they are a plain array of runs,
      // replaced wholesale on edit, so the index is their identity.
      <li key={index}>
        <InlineTextView value={item} />
      </li>
    ))}
  </ul>
)

const Entry: React.FC<{ block: EntryBlock; locale: string }> = ({
  block,
  locale,
}) => {
  const dates = formatDateRange(block.dateRange, locale)

  return (
    <div className="rp-entry">
      <div className="rp-entry-head">
        <div>
          <span className="rp-entry-title">
            <InlineTextView value={block.title} />
          </span>
          {block.subtitle === undefined ? null : (
            <>
              {/* A comma rather than a separate line: role and employer read as
                  one fact, and one line per entry saves a page over a resume. */}
              <span className="rp-entry-subtitle">
                {', '}
                <InlineTextView value={block.subtitle} />
              </span>
            </>
          )}
        </div>

        {dates === '' && block.location === undefined ? null : (
          <div className="rp-entry-meta">
            {dates === '' ? null : <div>{dates}</div>}
            {block.location === undefined ? null : (
              <div>
                <InlineTextView value={block.location} />
              </div>
            )}
          </div>
        )}
      </div>

      {block.summary === undefined ? null : (
        <p className="rp-entry-summary">
          <InlineTextView value={block.summary} />
        </p>
      )}

      {block.bullets.length === 0 ? null : (
        <ul className="rp-bullets">
          {block.bullets.map((bullet, index) => (
            <li key={index}>
              <InlineTextView value={bullet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TagList: React.FC<{ block: TagListBlock }> = ({ block }) => (
  <div className="rp-tags">
    {block.tags.map((tag, index) => (
      <span className="rp-tag" key={`${tag}-${index}`}>
        {tag}
      </span>
    ))}
  </div>
)

const Divider: React.FC<{ block: DividerBlock }> = () => (
  <div className="rp-divider" />
)

const IconLabel: React.FC<{ block: IconLabelBlock }> = ({ block }) => (
  <div className="rp-icon-label">
    <DocumentIcon icon={block.icon} />
    <span>
      <InlineTextView value={block.label} />
    </span>
  </div>
)

/**
 * A referenced image.
 *
 * Three states, drawn differently on purpose. Resolved, it is an `<img>` given
 * its intrinsic `aspect-ratio` from the stored record — so the box is the right
 * height before a single byte is decoded, and the page breaks around it do not
 * move when it paints. Absent from the map, the blob is still being read.
 * Mapped to `null`, the row is gone: that one never resolves, so it says so
 * rather than looking like a slow load forever.
 */
const Image: React.FC<{ block: ImageBlock; context: RenderContext }> = ({
  block,
  context,
}) => {
  const resolved = context.images.get(block.imageId)

  return (
    <figure
      className="rp-figure"
      style={
        block.widthPercent === undefined
          ? undefined
          : { width: `${block.widthPercent}%` }
      }
    >
      {resolved === undefined || resolved === null ? (
        <div className="rp-image-missing" data-image-id={block.imageId}>
          {resolved === null
            ? `Missing image${block.alt === '' ? '' : `: ${block.alt}`}`
            : block.alt === ''
              ? 'Image'
              : block.alt}
        </div>
      ) : (
        <img
          alt={block.alt}
          className="rp-image"
          src={resolved.url}
          style={{ aspectRatio: `${resolved.width} / ${resolved.height}` }}
        />
      )}
    </figure>
  )
}

const Raw: React.FC<{ block: RawBlock }> = ({ block }) => (
  <pre className="rp-raw">{block.markdown}</pre>
)

const DefaultBlock: React.FC<BlockProps> = ({ block, context }) => {
  switch (block.kind) {
    case 'paragraph':
      return <Paragraph block={block} />
    case 'bulletList':
      return <BulletList block={block} />
    case 'entry':
      return <Entry block={block} locale={context.locale} />
    case 'tagList':
      return <TagList block={block} />
    case 'image':
      return <Image block={block} context={context} />
    case 'divider':
      return <Divider block={block} />
    case 'iconLabel':
      return <IconLabel block={block} />
    case 'raw':
      return <Raw block={block} />
  }
}

export const defaultComponents: TemplateComponents = {
  Header: DefaultHeader,
  SectionHeading: DefaultSectionHeading,
  Block: DefaultBlock,
}
