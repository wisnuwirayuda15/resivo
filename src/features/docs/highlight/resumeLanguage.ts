import markdown from "highlight.js/lib/languages/markdown";

import type { HLJSApi, Language, LanguageFn, Mode } from "highlight.js";

/**
 * Resivo-Markdown, for a highlighter.
 *
 * The format is Markdown with three directive forms (`::name[label]{attrs}`,
 * `:::name{attrs}` ... `:::`, and an inline `:name{attrs}`), and neither
 * highlight.js's Markdown grammar nor Shiki's knows them, so every example on
 * the format pages would render its directives as plain text. This is the
 * Markdown grammar with those added in front, which is all the format is.
 *
 * Written to read like the format does: the directive name is a keyword, the
 * label is a string, and each attribute is a name and a value. It maps onto
 * classes `highlight.css` already colours, so a `resume` block matches the
 * Markdown and CSS blocks in the guide without a palette of its own.
 *
 * The lookbehind keeps `Note: x` and `10:30` from being read as directives: a
 * directive's colon is never directly after a word character, another colon or
 * a slash.
 */

const ATTRIBUTE_NAME: Mode = {
  scope: "attr",
  match: /[a-z][\w-]*(?==)/,
};

const QUOTED_VALUE: Mode = {
  scope: "string",
  begin: /"/,
  end: /"/,
};

const LABEL: Mode = {
  scope: "string",
  begin: /\[/,
  end: /\]/,
};

const ATTRIBUTES: Mode = {
  begin: /\{/,
  end: /\}/,
  contains: [ATTRIBUTE_NAME, QUOTED_VALUE],
};

/** `::contact`, `:::entry` or `:icon`, then its label and attributes up to the
 * next space. A label or attribute list may itself hold spaces, which is why
 * they are modes of their own and not part of one pattern. */
const DIRECTIVE: Mode = {
  beginScope: "keyword",
  begin: /(?<![\w:/]):{1,3}[a-z][\w-]*/,
  end: /(?=\s|$)/,
  contains: [LABEL, ATTRIBUTES],
};

/** The bare `:::` that closes a container directive. */
const CLOSER: Mode = {
  scope: "keyword",
  match: /^:{3}[ \t]*$/,
};

export const resume: LanguageFn = (hljs: HLJSApi): Language => {
  const base = markdown(hljs);

  return {
    ...base,
    name: "Resivo-Markdown",
    aliases: ["resivo"],
    contains: [CLOSER, DIRECTIVE, ...base.contains],
  };
};
