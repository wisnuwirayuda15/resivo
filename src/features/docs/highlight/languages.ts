import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import { createLowlight } from "lowlight";

import { resume } from "./resumeLanguage";

/**
 * The languages a docs code block can be.
 *
 * Six, on purpose: the format pages are `resume`, the styling pages are `css`,
 * and `bash` and `json` cover the install and backup pages. Registering only
 * these keeps the compile-time bundle small and, more usefully, makes a typo in
 * a fence (` ```reusme `) fall back to plain text instead of silently
 * highlighting as something else. Aliases are the ones people actually type.
 *
 * Compile time only: this runs while the MDX is built, so none of it ships to
 * the browser. The browser receives `<span class="hljs-...">`, which
 * `highlight.css` already colours for the light and dark schemes.
 */
export const lowlight = createLowlight({
  bash,
  css,
  json,
  markdown,
  resume,
});

lowlight.registerAlias({
  bash: ["sh", "shell", "zsh"],
  markdown: ["md"],
});

/** Languages that are shown as they are, with no highlighting. */
export const PLAIN_LANGUAGES = new Set(["text", "txt", "plain", "plaintext"]);
