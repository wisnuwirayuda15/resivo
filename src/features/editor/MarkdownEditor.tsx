import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Loader, useComputedColorScheme } from "@mantine/core";

import { serializeDocument } from "@/features/markdown/index";

import { EDITOR_OPTIONS, RESIVO_THEME, buildTheme } from "./monaco";

import type { editor } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import type { ParseWarning } from "@/features/markdown/index";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * The Markdown tab.
 *
 * The document model stays the source of truth: this shows a serialization of
 * it, and typing is parsed straight back into it. What makes that work rather
 * than fight itself is two rules, the buffer is replaced from the model only
 * when the two have genuinely diverged, and never while the caret is in it. The
 * first stops every unrelated store change from rewriting the file; the second
 * is what stops half-typed Markdown from reformatting itself under the reader's
 * hands, which is what a parse-and-reserialize loop does if nothing holds it
 * back. A withheld normalization is applied on blur instead.
 *
 * Parsing belongs to the caller, which owns the store. This component reports
 * text and is handed the resulting warnings back, so one keystroke causes one
 * parse.
 */

/**
 * How long typing settles before it is parsed.
 *
 * Parsing itself is cheap; what it costs is a new document, and therefore a
 * re-pagination of the preview. A quarter of a second is below the point where
 * a preview starts to feel detached from the text, and far above the interval
 * between two keystrokes.
 */
const PARSE_DELAY_MS = 250;

/** Monaco replaces a whole owner's markers at once, which is how a warning the
 * user has fixed disappears without anything having to track it. */
const MARKER_OWNER = "resivo-markdown";

interface MarkdownEditorProps {
  document: ResumeDocument;
  /** Warnings from the caller's parse of the last text this reported. */
  warnings: Array<ParseWarning>;
  onSourceChange: (source: string) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  document: resume,
  warnings,
  onSourceChange,
}) => {
  const scheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** What the model currently serializes to, the other half of the divergence
   * check below. */
  const serialized = useMemo(() => serializeDocument(resume), [resume]);
  const [value, setValue] = useState(serialized);

  /**
   * A trigger, not a source of truth.
   *
   * `hasTextFocus()` is what the effect below actually decides on, because it
   * cannot be stale. This exists only so that *losing* focus re-runs that effect
   * when the model itself has not changed, a state change is the only thing
   * that can. Reading it as the condition instead would reintroduce the bug it
   * is here to fix: Monaco does not always report a blur when focus leaves for
   * another document, and a `focused` stuck at `true` would then block every
   * later synchronization.
   */
  const [focusTick, setFocusTick] = useState(false);

  /**
   * Whether Monaco has mounted, which is also a trigger for the effect below.
   *
   * The editor is lazy and mounts a while after this component does, and until
   * then `editorRef` is null and the synchronization has nothing to compare. A
   * model that changed in that gap (the store swapping resumes under a freshly
   * opened editor) was never looked at again, because nothing in the effect's
   * dependencies moved afterwards, so the buffer kept the text it was created
   * with.
   */
  const [mounted, setMounted] = useState(false);

  /**
   * The view state to put back after the buffer is replaced.
   *
   * `@monaco-editor/react` applies a changed `value` as one full-range
   * `executeEdits` with `forceMoveMarkers`, which leaves the caret at the end of
   * the document. Saving the state before the replacement and restoring it after
   * is what keeps the caret and the scroll position where the reader left them.
   */
  const viewStateRef = useRef<editor.ICodeEditorViewState | null>(null);

  /**
   * Replaces the buffer from the model, unless the reader is typing in it.
   *
   * The buffer diverges for two quite different reasons. The model may have
   * changed elsewhere (undo, the style panel, an edit on the paper), and then
   * the buffer is simply out of date. Or the parse of what was typed serializes
   * differently from how it was written, which is the canonical form of the same
   * document.
   *
   * Only the second one can happen while someone is typing, and replacing the
   * buffer under them is exactly the wrong moment to normalize: half-written
   * Markdown reformats itself mid-keystroke. So an editor with the caret in it is
   * left alone and synchronized once the caret is elsewhere.
   *
   * The one condition is `hasTextFocus()`, asked at the moment of the decision.
   * `focusTick` is in the dependencies to make this run again on focus and blur;
   * it is deliberately not part of the condition.
   */
  useEffect(() => {
    const instance = editorRef.current;

    if (
      instance === null ||
      instance.getValue() === serialized ||
      instance.hasTextFocus()
    ) {
      return;
    }

    viewStateRef.current = instance.saveViewState();
    setValue(serialized);
  }, [focusTick, mounted, serialized]);

  /**
   * Runs after the child editor has applied the new `value`, child effects
   * commit before a parent's, which is what makes this ordering reliable rather
   * than a race against a frame.
   */
  useEffect(() => {
    const instance = editorRef.current;
    const state = viewStateRef.current;

    if (instance !== null && state !== null) {
      viewStateRef.current = null;
      instance.restoreViewState(state);
    }
  }, [value]);

  /**
   * The theme is rebuilt whenever the colour scheme changes, under one name.
   *
   * It cannot be built once for each scheme up front: the palette is read out of
   * the live computed styles, so whichever scheme is not currently applied would
   * be read as the one that is. Redefining the active theme reads the values
   * that are actually in effect.
   */
  useEffect(() => {
    const monaco = monacoRef.current;

    if (monaco !== null) {
      monaco.editor.defineTheme(
        RESIVO_THEME,
        buildTheme(window.document.documentElement, scheme === "dark"),
      );
      monaco.editor.setTheme(RESIVO_THEME);
    }
  }, [scheme]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();

    if (monaco === null || model === null || model === undefined) {
      return;
    }

    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      warnings.map((warning) => ({
        // Warning, never error: everything reported here still round-trips, it
        // just will not be typeset. Calling it an error would say the document
        // is broken when it is merely unusual.
        severity: monaco.MarkerSeverity.Warning,
        message: warning.message,
        startLineNumber: warning.line,
        startColumn: warning.column,
        endLineNumber: warning.line,
        // To end of line: what is being warned about is the whole block, and
        // its exact extent is not what the reader needs pointed out.
        endColumn: model.getLineMaxColumn(warning.line),
      })),
    );
  }, [warnings]);

  const handleChange = (next: string | undefined) => {
    if (next === undefined) {
      return;
    }

    setValue(next);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onSourceChange(next);
    }, PARSE_DELAY_MS);
  };

  /**
   * Parses what is in the buffer now, instead of when the timer would have.
   *
   * Called on unmount (which is what switching to the CSS tab is), and on blur,
   * where it has to run *before* the buffer may be replaced from the model:
   * otherwise the replacement would be a serialization of a document that does
   * not yet include the last few keystrokes, and they would be erased.
   */
  const flush = useCallback(() => {
    if (timerRef.current === null) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;

    const current = editorRef.current?.getValue();

    if (current !== undefined) {
      onSourceChange(current);
    }
  }, [onSourceChange]);

  useEffect(() => flush, [flush]);

  return (
    <Editor
      beforeMount={(monaco) => {
        monacoRef.current = monaco;
        monaco.editor.defineTheme(
          RESIVO_THEME,
          buildTheme(window.document.documentElement, scheme === "dark"),
        );
      }}
      language="markdown"
      loading={<Loader size="sm" />}
      onChange={handleChange}
      onMount={(instance) => {
        editorRef.current = instance;
        setMounted(true);

        instance.onDidFocusEditorText(() => setFocusTick((tick) => !tick));

        // Blur is when a normalization that was withheld becomes safe to apply.
        // Flushing first is what makes the sync that follows a serialization of
        // everything typed, rather than of everything typed but the last word.
        instance.onDidBlurEditorText(() => {
          flush();
          setFocusTick((tick) => !tick);
        });
      }}
      options={EDITOR_OPTIONS}
      theme={RESIVO_THEME}
      value={value}
    />
  );
};
