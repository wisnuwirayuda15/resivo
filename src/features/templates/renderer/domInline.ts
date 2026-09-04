/**
 * Reading the DOM back into `InlineText`.
 *
 * The inverse of `InlineTextView`, and only of that: it understands exactly the
 * elements that renderer emits, because the DOM it reads is the DOM that
 * renderer wrote, plus whatever a browser inserted while the user typed into it
 * (`<br>`, a stray `<div>`, a pasted `<b>`).
 *
 * Anything unrecognised contributes its text and loses its formatting rather
 * than being dropped. That is the right trade for a resume: losing a mark is
 * visible and fixable, losing a sentence is not.
 */

import { isIconWeight } from "@/features/icons/catalog";
import { MARKS } from "@/features/resume/model/document";

import type {
  InlineNode,
  InlineText,
  Mark,
} from "@/features/resume/model/document";

/** Tag names that stand for a mark. Both the semantic element the renderer
 * writes and the presentational one a browser's own editing commands produce. */
const MARK_TAGS: Record<string, Mark> = {
  STRONG: "bold",
  B: "bold",
  EM: "italic",
  I: "italic",
  S: "strike",
  DEL: "strike",
  STRIKE: "strike",
  CODE: "code",
};

/**
 * Marks in the model's own order.
 *
 * Sorted rather than kept in the order the DOM nested them, so the same
 * formatting always produces the same node, otherwise a field that was never
 * touched could serialise differently after a round trip and register as an
 * edit.
 */
const orderMarks = (marks: ReadonlySet<Mark>): Array<Mark> =>
  MARKS.filter((mark) => marks.has(mark));

const textNode = (text: string, marks: ReadonlySet<Mark>): InlineNode => {
  const ordered = orderMarks(marks);

  return ordered.length === 0
    ? { type: "text", text }
    : { type: "text", text, marks: ordered };
};

const sameMarks = (a: InlineNode, b: InlineNode): boolean =>
  a.type === "text" &&
  b.type === "text" &&
  (a.marks ?? []).join(",") === (b.marks ?? []).join(",");

/**
 * Merges adjacent text runs that carry the same marks, and drops empty ones.
 *
 * A browser splits a text node on every edit, so typing one word into a bold
 * span can leave four separate nodes saying the same thing. Without this, every
 * keystroke would grow the document.
 */
const collapse = (nodes: InlineText): InlineText => {
  const out: InlineText = [];

  for (const node of nodes) {
    if (node.type === "text" && node.text === "") {
      continue;
    }

    const last = out[out.length - 1];

    if (
      last !== undefined &&
      last.type === "text" &&
      node.type === "text" &&
      sameMarks(last, node)
    ) {
      out[out.length - 1] = { ...last, text: last.text + node.text };
      continue;
    }

    out.push(node);
  }

  return out;
};

const walk = (node: Node, marks: ReadonlySet<Mark>): InlineText => {
  if (node.nodeType === Node.TEXT_NODE) {
    return [textNode(node.nodeValue ?? "", marks)];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as Element;
  const children = () =>
    Array.from(element.childNodes).flatMap((child) => walk(child, marks));

  if (element.tagName === "BR") {
    /**
     * A line break becomes a space, not a newline. These are single-line fields
     * in a print document, a heading that wraps does so because the column is
     * that wide, and a hard break inside one would survive into the PDF as a
     * gap the user cannot see the cause of.
     */
    return [textNode(" ", marks)];
  }

  if (element.tagName === "A") {
    const href = element.getAttribute("href") ?? "";
    const inner = collapse(children());

    // A link with no text is not a link the reader can see or click.
    return inner.length === 0 ? [] : [{ type: "link", href, children: inner }];
  }

  /**
   * An icon is a node in the model, not text, and it has no textual form to
   * recover from the DOM. It is left alone by the editing surface (see
   * `EditableText`), and read back here from the attribute the renderer wrote.
   */
  const iconName = element.getAttribute("data-icon-name");

  if (iconName !== null && iconName !== "") {
    const weight = element.getAttribute("data-icon-weight") ?? "";

    return [
      {
        type: "icon",
        icon: {
          library: "phosphor",
          name: iconName,
          // A weight this build does not know is dropped rather than stored:
          // the document would keep a value nothing can render.
          ...(isIconWeight(weight) ? { weight } : {}),
        },
      },
    ];
  }

  const mark = MARK_TAGS[element.tagName];

  if (mark !== undefined) {
    return Array.from(element.childNodes).flatMap((child) =>
      walk(child, new Set([...marks, mark])),
    );
  }

  return children();
};

/**
 * The `InlineText` an element's contents represent.
 *
 * Round-trips `InlineTextView`'s output: rendering the result again produces the
 * same DOM. That is asserted rather than assumed, see `domInline.test.ts`.
 */
export const domToInline = (element: Element): InlineText =>
  collapse(
    Array.from(element.childNodes).flatMap((child) => walk(child, new Set())),
  );
