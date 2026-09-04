import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import cssWorker from "monaco-editor/language/css/css.worker?worker";
import editorWorker from "monaco-editor/editor/editor.worker?worker";

import type { editor } from "monaco-editor";

/**
 * Monaco, wired for a local-first app.
 *
 * Two things have to be arranged before an editor mounts, and both are the
 * reason this file exists rather than the options living at the call site.
 *
 * **No CDN.** `@monaco-editor/react` loads Monaco from jsDelivr by default,
 * which would make the editor (the core of the product) unusable offline and
 * would tell a third party every time someone opened a resume. `loader.config`
 * hands it the bundled copy instead, so nothing leaves the machine.
 *
 * **Workers.** Monaco runs its language services in web workers and has no
 * fallback worth having; without them the editor loads and then reports that it
 * cannot start. Vite's `?worker` imports bundle them locally, same as the editor
 * itself.
 *
 * Imported for its side effects, from the client-only island that renders the
 * editor. It must never be imported from a module the server evaluates: it
 * touches `self` at load.
 */

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

if (typeof window !== "undefined") {
  window.MonacoEnvironment = {
    getWorker: (_workerId, label) =>
      // Markdown needs no worker of its own (it is tokenised in the main
      // thread), so anything that is not CSS gets the generic editor worker.
      label === "css" || label === "scss" || label === "less"
        ? new cssWorker()
        : new editorWorker(),
  };

  loader.config({ monaco });
}

/**
 * One theme name, redefined when the colour scheme changes.
 *
 * Not two: the palette is read from the live computed styles, so a theme built
 * for the scheme that is not currently applied would be built from the wrong
 * values.
 */
export const RESIVO_THEME = "resivo";

const token = (root: Element, name: string, fallback: string): string => {
  const value = getComputedStyle(root).getPropertyValue(name).trim();

  return value === "" ? fallback : value;
};

/** Monaco wants six hex digits with no alpha and no `var()`. A palette entry
 * that resolves to anything else is dropped in favour of the fallback rather
 * than passed on, because an unparseable colour makes Monaco throw. */
const HEX = /^#[0-9a-f]{6}$/i;

const colour = (root: Element, name: string, fallback: string): string => {
  const value = token(root, name, fallback);

  return HEX.test(value) ? value : fallback;
};

export const buildTheme = (
  root: Element,
  dark: boolean,
): editor.IStandaloneThemeData => {
  const syntax = {
    comment: colour(root, "--syn-comment", dark ? "#6f6f68" : "#9b9b93"),
    key: colour(root, "--syn-key", dark ? "#57b6ae" : "#066560"),
    string: colour(root, "--syn-string", dark ? "#d9a95c" : "#8a5606"),
    number: colour(root, "--syn-number", dark ? "#7fb0e6" : "#2563a8"),
    heading: colour(root, "--syn-heading", dark ? "#f2f2f0" : "#1d1d1a"),
    punct: colour(root, "--syn-punct", dark ? "#8a8a83" : "#79796f"),
    selector: colour(root, "--syn-selector", dark ? "#b98ad9" : "#7a3ea8"),
    gutter: colour(root, "--syn-gutter", dark ? "#4d4d47" : "#9b9b93"),
  };

  const surface = colour(root, "--bg-code", dark ? "#131417" : "#fbfbfa");
  const text = colour(root, "--text-body", dark ? "#d7d7d3" : "#2e2e2a");

  return {
    base: dark ? "vs-dark" : "vs",
    // Inherits Monaco's own rules for the tokens the design system says nothing
    // about, rather than leaving them unstyled.
    inherit: true,
    rules: [
      { token: "comment", foreground: syntax.comment },
      { token: "keyword", foreground: syntax.key },
      { token: "string", foreground: syntax.string },
      { token: "number", foreground: syntax.number },
      { token: "attribute.name", foreground: syntax.key },
      { token: "attribute.value", foreground: syntax.string },
      { token: "tag", foreground: syntax.selector },
      { token: "delimiter", foreground: syntax.punct },
      // Markdown: headings carry the document's structure, so they get the
      // strongest colour on the page and the only bold run.
      { token: "keyword.md", foreground: syntax.heading, fontStyle: "bold" },
      { token: "strong.md", foreground: text, fontStyle: "bold" },
      { token: "emphasis.md", foreground: text, fontStyle: "italic" },
      { token: "string.link.md", foreground: syntax.string },
      { token: "variable.md", foreground: syntax.key },
      // CSS, for the tab phase 8 fills in.
      { token: "attribute.name.css", foreground: syntax.key },
      { token: "attribute.value.css", foreground: syntax.string },
      { token: "tag.css", foreground: syntax.selector },
    ],
    colors: {
      "editor.background": surface,
      "editor.foreground": text,
      "editorLineNumber.foreground": syntax.gutter,
      "editorLineNumber.activeForeground": text,
      "editorGutter.background": surface,
      "editorIndentGuide.background1": syntax.gutter,
      "editorWidget.background": surface,
      "editorHoverWidget.background": surface,
    },
  };
};

/**
 * Editor options shared by both tabs.
 *
 * The design system's code type is 13px JetBrains Mono at 1.7, and a resume is
 * prose: soft wrapping on, minimap off, no code folding and no suggestion popups
 * for what is mostly plain text.
 */
export const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  fontFamily:
    "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
  fontSize: 13,
  lineHeight: 1.7,
  fontLigatures: false,
  minimap: { enabled: false },
  wordWrap: "on",
  wrappingStrategy: "advanced",
  folding: false,
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 8,
  glyphMargin: false,
  renderLineHighlight: "none",
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  scrollBeyondLastLine: false,
  padding: { top: 10, bottom: 24 },
  quickSuggestions: false,
  occurrencesHighlight: "off",
  selectionHighlight: false,
  automaticLayout: true,
  tabSize: 2,
};
