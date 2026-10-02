import { visit } from "unist-util-visit";

import { PLAIN_LANGUAGES, lowlight } from "./languages";

import type { Element, ElementContent, Root, Text } from "hast";

/**
 * Highlights every fenced code block at compile time, and tells the block
 * component what the fence said.
 *
 * Replaces Fumadocs' shiki `rehypeCode` (turned off in `source.config.ts`) for
 * the reasons in `languages.ts`. For each `<pre><code class="language-x">`:
 *
 * - the code's children become highlight.js spans, and it gains `hljs`;
 * - the `pre` gets `data-language` (what was written, or `text`), and
 *   `data-title` from a `title="..."` in the fence's meta string, which is
 *   everything after the language. The component reads those and draws the
 *   header, so no markup for it is built here.
 *
 * Other words in the meta (`warns`, `verify`, `refused`) are for the content
 * tests, which read the Markdown and not this output, and are not displayed.
 * A language that is not registered is left unhighlighted and is not an error:
 * a block that reads as plain text is a better failure than a build that stops.
 */

const textOf = (node: Element | Text): string =>
  node.type === "text"
    ? node.value
    : node.children
        .map((child) =>
          child.type === "text" || child.type === "element"
            ? textOf(child)
            : "",
        )
        .join("");

const languageOf = (code: Element): string | undefined => {
  const classes = code.properties["className"];

  if (!Array.isArray(classes)) {
    return undefined;
  }

  const found = classes.find(
    (name) => typeof name === "string" && name.startsWith("language-"),
  );

  return typeof found === "string"
    ? found.slice("language-".length)
    : undefined;
};

const titleOf = (code: Element): string | undefined => {
  const meta = (code.data as { meta?: unknown } | undefined)?.meta;

  return typeof meta === "string"
    ? /\btitle="([^"]*)"/.exec(meta)?.[1]
    : undefined;
};

export const rehypeHighlight = () => (tree: Root) => {
  visit(tree, "element", (pre) => {
    if (pre.tagName !== "pre") {
      return;
    }

    const code = pre.children.find(
      (child): child is Element =>
        child.type === "element" && child.tagName === "code",
    );

    if (code === undefined) {
      return;
    }

    const language = languageOf(code);
    const title = titleOf(code);

    pre.properties["dataLanguage"] =
      language === undefined || PLAIN_LANGUAGES.has(language)
        ? "text"
        : language;

    if (title !== undefined) {
      pre.properties["dataTitle"] = title;
    }

    if (
      language !== undefined &&
      !PLAIN_LANGUAGES.has(language) &&
      lowlight.registered(language)
    ) {
      const result = lowlight.highlight(language, textOf(code));

      code.children = result.children as Array<ElementContent>;
      code.properties["className"] = ["hljs", `language-${language}`];
    }
  });
};
