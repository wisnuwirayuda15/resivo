import { DocumentIcon } from "@/features/icons/IconRenderer";
import {
  setBlockText,
  setBulletItem,
  setEntryBullet,
  setEntryField,
  setHeaderHeadline,
  setHeaderName,
  setQuoteParagraph,
  setSectionTitle,
  setTableCell,
  setTag,
  updateContactLabel,
} from "@/features/editor/mutations";
import { plainText } from "@/features/resume/model/index";

import { EditableText } from "./EditableText";
import { formatDateRange } from "./dates";

import type { Recipe } from "@/features/editor/mutations";
import type {
  BlockProps,
  HeaderProps,
  RenderContext,
  SectionHeadingProps,
  TemplateComponents,
} from "./types";
import type {
  BulletListBlock,
  CodeBlock,
  EntryBlock,
  HeadingBlock,
  IconLabelBlock,
  ImageBlock,
  InlineText,
  NestedList,
  ParagraphBlock,
  QuoteBlock,
  RawBlock,
  Section,
  TableBlock,
  TagListBlock,
} from "@/features/resume/model/document";

/**
 * The default renderers, the resume every template starts from.
 *
 * A template supplies only the pieces it wants to change; `resolveTemplate`
 * fills the rest from here. Almost all visual difference between templates is
 * carried by CSS tokens rather than by markup, which is what keeps four
 * templates from becoming four renderers to keep in sync.
 *
 * Plain elements and `rp-` class names throughout, never `Box`/`Text` or a
 * Tailwind utility: this markup is serialised into the iframe and, later, into
 * the HTML export, neither of which carries the app's stylesheets. The only
 * inline styles are per-block values out of the document that no class could
 * name, an image's width, a table column's alignment.
 *
 * Every run of text goes through `EditableText`, which is what makes the paper
 * the editing surface. Outside `edit` mode that component renders exactly what
 * `InlineTextView` renders, so this file has one markup, not one per mode, and
 * an export cannot accidentally carry editing chrome.
 */

/**
 * Wires a field to the store, or returns `undefined` when there is no store to
 * write to, which is what makes the field non-editable in view and print.
 */
const commitWith = (
  context: RenderContext,
  build: (value: InlineText) => Recipe,
): ((value: InlineText) => void) | undefined => {
  const { apply } = context;

  return apply === undefined ? undefined : (value) => apply(build(value));
};

const DefaultHeader: React.FC<HeaderProps> = ({ header, context }) => {
  const avatar =
    header.avatarImageId === undefined
      ? undefined
      : context.images.get(header.avatarImageId);

  return (
    <header className="rp-header">
      {/**
       * Rendered only once the blob resolves, and never as a reserved box. The
       * avatar's size is a style token, so an empty box of exactly that size
       * would be indistinguishable from a photograph that failed, and drawing
       * nothing costs nothing here, because the flex row simply closes up and
       * re-opens when the image arrives, which re-paginates anyway.
       */}
      {avatar === undefined || avatar === null ? null : (
        <img alt="" className="rp-avatar" src={avatar.url} />
      )}

      <div className="rp-header-text">
        <div className="rp-name">
          <EditableText
            context={context}
            label="name"
            onCommit={commitWith(context, setHeaderName)}
            value={header.name}
          />
        </div>

        {header.headline === undefined ? null : (
          <div className="rp-headline">
            <EditableText
              context={context}
              label="headline"
              onCommit={commitWith(context, setHeaderHeadline)}
              value={header.headline}
            />
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
                    <EditableText
                      context={context}
                      label="contact"
                      onCommit={commitWith(context, (value) =>
                        updateContactLabel(contact.id, value),
                      )}
                      value={contact.label}
                    />
                  </span>
                </>
              );

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
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};

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
}) =>
  /**
   * An untitled section draws no heading and no rule.
   *
   * This is where content that arrived above the first heading lives (pasted
   * text, usually), and giving it an empty heading row would print a rule with
   * nothing over it. Titling it is done in the Markdown pane, by writing the
   * heading the paste did not have.
   */
  plainText(section.title) === "" ? null : (
    <div className="rp-section">
      <div className="rp-section-title-row">
        {section.icon === undefined ? null : (
          <DocumentIcon icon={section.icon} />
        )}
        <h2 className="rp-section-title">
          <EditableText
            context={context}
            label="section heading"
            onCommit={commitWith(context, (value) =>
              setSectionTitle(section.id, value),
            )}
            value={section.title}
          />
        </h2>
      </div>

      {(section.style?.showDivider ?? context.design.rules.showDividers) ? (
        <div className="rp-section-rule" />
      ) : null}
    </div>
  );

interface BlockViewProps<T> {
  block: T;
  section: Section;
  context: RenderContext;
}

const Paragraph: React.FC<BlockViewProps<ParagraphBlock>> = ({
  block,
  section,
  context,
}) => (
  <p>
    <EditableText
      context={context}
      label="paragraph"
      onCommit={commitWith(context, (value) =>
        setBlockText(section.id, block.id, value),
      )}
      value={block.text}
    />
  </p>
);

/**
 * A list, at any depth.
 *
 * Items carry no id in the model (they are positions in an array, replaced
 * wholesale on edit), so the path down to an item is its identity, both as the
 * React key and as what the mutation is told to write.
 *
 * A task list renders its checkbox as text rather than an `<input>`: this markup
 * is printed and exported, where a form control is neither meaningful nor
 * reliably drawn.
 */
const ListItems: React.FC<{
  list: NestedList;
  path: ReadonlyArray<number>;
  block: BulletListBlock;
  section: Section;
  context: RenderContext;
}> = ({ list, path, block, section, context }) => {
  const Tag = list.ordered === true ? "ol" : "ul";

  return (
    <Tag
      className={list.ordered === true ? "rp-list rp-list-ordered" : "rp-list"}
      start={list.ordered === true ? list.start : undefined}
    >
      {list.items.map((item, index) => {
        const here = [...path, index];

        return (
          <li
            className={item.checked === undefined ? undefined : "rp-task"}
            key={here.join(".")}
          >
            {item.checked === undefined ? null : (
              <span aria-hidden="true" className="rp-checkbox">
                {item.checked ? "☑" : "☐"}
              </span>
            )}
            <EditableText
              context={context}
              label="bullet"
              onCommit={commitWith(context, (value) =>
                setBulletItem(section.id, block.id, here, value),
              )}
              value={item.text}
            />
            {item.list === undefined ? null : (
              <ListItems
                block={block}
                context={context}
                list={item.list}
                path={here}
                section={section}
              />
            )}
          </li>
        );
      })}
    </Tag>
  );
};

const BulletList: React.FC<BlockViewProps<BulletListBlock>> = ({
  block,
  section,
  context,
}) => (
  <ListItems
    block={block}
    context={context}
    list={block}
    path={[]}
    section={section}
  />
);

/** Written out rather than built from the level, so the tag is a known element
 * name to the type system and to JSX rather than an interpolated string. */
const HEADING_TAGS = { 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

/**
 * A subheading inside a section.
 *
 * The level comes from the document, so the element does too, a resume read by
 * a screen reader or an applicant tracking system should have the outline its
 * author wrote, not one flattened to a single tag.
 */
const Heading: React.FC<BlockViewProps<HeadingBlock>> = ({
  block,
  section,
  context,
}) => {
  const Tag = HEADING_TAGS[block.level];

  return (
    <Tag className="rp-heading" data-level={block.level}>
      <EditableText
        context={context}
        label="heading"
        onCommit={commitWith(context, (value) =>
          setBlockText(section.id, block.id, value),
        )}
        value={block.text}
      />
    </Tag>
  );
};

const Quote: React.FC<BlockViewProps<QuoteBlock>> = ({
  block,
  section,
  context,
}) => (
  <blockquote className="rp-quote">
    {block.paragraphs.map((paragraph, index) => (
      <p key={index}>
        <EditableText
          context={context}
          label="quote"
          onCommit={commitWith(context, (value) =>
            setQuoteParagraph(section.id, block.id, index, value),
          )}
          value={paragraph}
        />
      </p>
    ))}
  </blockquote>
);

/**
 * A fenced code block.
 *
 * Not editable on the paper, deliberately: everything inside a fence is literal,
 * and a `contenteditable` region would let the browser normalize whitespace and
 * insert markup into text whose whole point is that it is exact. It is edited in
 * the Markdown pane.
 */
const Code: React.FC<BlockViewProps<CodeBlock>> = ({ block }) => (
  <pre className="rp-code-block" data-language={block.language}>
    <code>{block.code}</code>
  </pre>
);

const Table: React.FC<BlockViewProps<TableBlock>> = ({
  block,
  section,
  context,
}) => {
  const cell = (row: number, column: number, value: InlineText) => (
    <EditableText
      context={context}
      label="table cell"
      onCommit={commitWith(context, (next) =>
        setTableCell(section.id, block.id, row, column, next),
      )}
      value={value}
    />
  );

  const align = (column: number) => block.align[column] ?? undefined;

  return (
    <table className="rp-table">
      <thead>
        <tr>
          {block.head.map((heading, column) => (
            <th key={column} style={{ textAlign: align(column) }}>
              {cell(-1, column, heading)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((value, column) => (
              <td key={column} style={{ textAlign: align(column) }}>
                {cell(rowIndex, column, value)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Entry: React.FC<BlockViewProps<EntryBlock>> = ({
  block,
  section,
  context,
}) => {
  const dates = formatDateRange(block.dateRange, context.locale);

  const field = (name: "title" | "subtitle" | "location" | "summary") =>
    commitWith(context, (value) =>
      setEntryField(section.id, block.id, name, value),
    );

  return (
    <div className="rp-entry">
      <div className="rp-entry-head">
        <div>
          <span className="rp-entry-title">
            <EditableText
              context={context}
              label="entry title"
              onCommit={field("title")}
              value={block.title}
            />
          </span>
          {block.subtitle === undefined ? null : (
            <>
              {/* A comma rather than a separate line: role and employer read as
                  one fact, and one line per entry saves a page over a resume. */}
              <span className="rp-entry-subtitle">
                {", "}
                <EditableText
                  context={context}
                  label="entry subtitle"
                  onCommit={field("subtitle")}
                  value={block.subtitle}
                />
              </span>
            </>
          )}
        </div>

        {dates === "" && block.location === undefined ? null : (
          <div className="rp-entry-meta">
            {/**
             * The dates are the one run of text on the paper that is *derived*,
             * `formatDateRange` turns two ISO strings into whatever the locale
             * writes. Editing the rendered string would mean parsing prose back
             * into dates, and a resume that silently misreads "Mar 2019" is worse
             * than one whose dates are edited in the Markdown pane. So this stays
             * read-only here, deliberately.
             */}
            {dates === "" ? null : <div>{dates}</div>}
            {block.location === undefined ? null : (
              <div>
                <EditableText
                  context={context}
                  label="entry location"
                  onCommit={field("location")}
                  value={block.location}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {block.summary === undefined ? null : (
        <p className="rp-entry-summary">
          <EditableText
            context={context}
            label="entry summary"
            onCommit={field("summary")}
            value={block.summary}
          />
        </p>
      )}

      {block.bullets.length === 0 ? null : (
        <ul className="rp-bullets">
          {block.bullets.map((bullet, index) => (
            <li key={index}>
              <EditableText
                context={context}
                label="entry bullet"
                onCommit={commitWith(context, (value) =>
                  setEntryBullet(section.id, block.id, index, value),
                )}
                value={bullet}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TagList: React.FC<BlockViewProps<TagListBlock>> = ({
  block,
  section,
  context,
}) => (
  <div className="rp-tags">
    {block.tags.map((tag, index) => (
      <span className="rp-tag" key={`${tag}-${index}`}>
        {/* A tag is a plain string in the model, so whatever formatting is typed
            into it is flattened on commit, the chip is a keyword, not prose. */}
        <EditableText
          context={context}
          label="tag"
          onCommit={commitWith(context, (value) =>
            setTag(section.id, block.id, index, plainText(value)),
          )}
          value={[{ type: "text", text: tag }]}
        />
      </span>
    ))}
  </div>
);

const Divider: React.FC = () => <div className="rp-divider" />;

/**
 * A forced page break, drawn as a marker of no height.
 *
 * Zero height in every mode and every medium, with the dashed rule and its
 * caption painted by an absolutely positioned pseudo-element. That is the whole
 * design: the paginator measures this item like any other, and if the marker
 * occupied space the measured height would differ from the printed one. It is
 * also why the marker is not hidden in print, there is nothing to hide, only a
 * rule that `@media print` stops painting.
 *
 * `aria-hidden` because a screen reader gets nothing from it: the break is a
 * layout instruction, and the reading order is unchanged either side of it.
 */
const PageBreak: React.FC = () => (
  <div aria-hidden className="rp-page-break" data-label="Page break" />
);

const IconLabel: React.FC<BlockViewProps<IconLabelBlock>> = ({
  block,
  section,
  context,
}) => (
  <div className="rp-icon-label">
    <DocumentIcon icon={block.icon} />
    <span>
      <EditableText
        context={context}
        label="label"
        onCommit={commitWith(context, (value) =>
          setBlockText(section.id, block.id, value),
        )}
        value={block.label}
      />
    </span>
  </div>
);

/**
 * A referenced image.
 *
 * Three states, drawn differently on purpose. Resolved, it is an `<img>` given
 * its intrinsic `aspect-ratio` from the stored record, so the box is the right
 * height before a single byte is decoded, and the page breaks around it do not
 * move when it paints. Absent from the map, the blob is still being read.
 * Mapped to `null`, the row is gone: that one never resolves, so it says so
 * rather than looking like a slow load forever.
 */
const Image: React.FC<{ block: ImageBlock; context: RenderContext }> = ({
  block,
  context,
}) => {
  const resolved = context.images.get(block.imageId);

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
            ? `Missing image${block.alt === "" ? "" : `: ${block.alt}`}`
            : block.alt === ""
              ? "Image"
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
  );
};

const Raw: React.FC<{ block: RawBlock }> = ({ block }) => (
  <pre className="rp-raw">{block.markdown}</pre>
);

const DefaultBlock: React.FC<BlockProps> = ({ block, section, context }) => {
  switch (block.kind) {
    case "paragraph":
      return <Paragraph block={block} context={context} section={section} />;
    case "heading":
      return <Heading block={block} context={context} section={section} />;
    case "bulletList":
      return <BulletList block={block} context={context} section={section} />;
    case "quote":
      return <Quote block={block} context={context} section={section} />;
    case "code":
      return <Code block={block} context={context} section={section} />;
    case "table":
      return <Table block={block} context={context} section={section} />;
    case "entry":
      return <Entry block={block} context={context} section={section} />;
    case "tagList":
      return <TagList block={block} context={context} section={section} />;
    case "image":
      return <Image block={block} context={context} />;
    case "divider":
      return <Divider />;
    case "pageBreak":
      return <PageBreak />;
    case "iconLabel":
      return <IconLabel block={block} context={context} section={section} />;
    case "raw":
      return <Raw block={block} />;
  }
};

export const defaultComponents: TemplateComponents = {
  Header: DefaultHeader,
  SectionHeading: DefaultSectionHeading,
  Block: DefaultBlock,
};
