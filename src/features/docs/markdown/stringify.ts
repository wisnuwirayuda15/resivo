import type { LLMsOptions } from "fumadocs-core/mdx-plugins/remark-llms";
import type { Nodes } from "mdast";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import type { Info, State } from "mdast-util-to-markdown";

/**
 * How a page's MDX is written back out as plain Markdown.
 *
 * The same text is what a reader copies, what `.md` serves, and what an agent
 * reads through `llms.txt`, so it has to stand without the components that draw
 * the page. Fumadocs keeps `Callout` and `Card` as JSX by default and flattens
 * everything else to its children, which leaves a model reading
 * `<Callout type="warning">` and a pasted copy with tags in it. Every component
 * an author may write gets its Markdown form here, and any other one is reduced
 * to its children, so a new component can never leak a tag into the output.
 *
 * Heading ids (`## Try it [#try]`) are left in the text on purpose: they are how
 * a link to a heading is written, and `resolveHeadingIds` turns them into what a
 * Markdown reader understands once the page is rendered.
 */

type Element = MdxJsxFlowElement | MdxJsxTextElement;

const isElement = (node: Nodes): node is Element =>
  node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";

/** A string attribute, or undefined for a missing one and for `{expression}`. */
const attribute = (node: Element, name: string): string | undefined => {
  for (const attr of node.attributes) {
    if (
      attr.type === "mdxJsxAttribute" &&
      attr.name === name &&
      typeof attr.value === "string"
    ) {
      return attr.value;
    }
  }

  return undefined;
};

const PHRASING = new Set([
  "text",
  "emphasis",
  "strong",
  "delete",
  "inlineCode",
  "link",
  "break",
  "image",
  "mdxJsxTextElement",
  "mdxTextExpression",
]);

/**
 * What an element holds, written out.
 *
 * `<Callout>One line.</Callout>` on a single line parses its content as
 * phrasing, not as a paragraph, and written as flow each piece (the text, the
 * code span, the rest of the text) becomes a paragraph of its own. So content
 * made only of phrasing is written as one run. The typings of both calls are a
 * closed list of mdast parents, which an MDX element is not, hence the casts.
 */
const flow = (node: Element, state: State, info: Info): string =>
  node.children.every((child) => PHRASING.has(child.type))
    ? state.containerPhrasing(node, info)
    : state.containerFlow(node as never, info);

const quote = (text: string): string =>
  text
    .split("\n")
    .map((line) => (line === "" ? ">" : `> ${line}`))
    .join("\n");

const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

const callout = (node: Element, state: State, info: Info): string => {
  const title = attribute(node, "title");
  const type = attribute(node, "type") ?? "note";
  const body = flow(node, state, info);
  // The kind is said in words because the colour that carries it on the page is
  // gone: a warning that reads like a note would change what a model advises.
  const heading = `**${title ?? type.charAt(0).toUpperCase() + type.slice(1)}**`;

  return quote(body === "" ? heading : `${heading}\n\n${body}`);
};

const card = (node: Element, state: State, info: Info): string => {
  const title = attribute(node, "title") ?? "";
  const href = attribute(node, "href") ?? "";
  const body = oneLine(flow(node, state, info));

  return `- [${title}](${href})${body === "" ? "" : `: ${body}`}`;
};

export const stringifyDocsElement: NonNullable<LLMsOptions["stringify"]> = (
  node,
  _parent,
  state,
  info,
) => {
  if (!isElement(node)) {
    return undefined;
  }

  switch (node.name) {
    case "Callout":
      return callout(node, state, info);
    case "Card":
      return card(node, state, info);
    case "Cards":
      return node.children
        .filter((child): child is Element => isElement(child))
        .map((child) => card(child, state, info))
        .join("\n");
    case "Tab":
      return `**${attribute(node, "value") ?? ""}**\n\n${flow(node, state, info)}`;
    case "Kbd":
      return `\`${oneLine(state.containerPhrasing(node, info))}\``;
    default:
      return undefined;
  }
};

export const docsMarkdownOptions: LLMsOptions = {
  // The writer's defaults are `*` bullets and `*` rules, which read as noise
  // next to the hyphens every other document in the docs uses.
  bullet: "-",
  rule: "-",
  // Anything not handled above is its children. `Steps` and `Step` are the
  // cases that rely on it: their content is ordinary headings and paragraphs.
  filterElement: (node) => (isElement(node) ? "children-only" : true),
  stringify: stringifyDocsElement,
};
