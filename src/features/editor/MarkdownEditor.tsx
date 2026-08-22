import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Loader, useComputedColorScheme } from '@mantine/core'

import { serializeDocument } from '@/features/markdown/index'

import { EDITOR_OPTIONS, RESIVO_THEME, buildTheme } from './monaco'

import type { editor } from 'monaco-editor'
import type { Monaco } from '@monaco-editor/react'
import type { ParseWarning } from '@/features/markdown/index'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The Markdown tab.
 *
 * The document model stays the source of truth: this shows a serialization of
 * it, and typing is parsed straight back into it. What makes that work rather
 * than fight itself is one rule — the buffer is only replaced from the model
 * when the two have genuinely diverged. Pushing the model into the buffer on
 * every store change would move the caret to the end of the document while
 * someone was typing in the middle of it.
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
const PARSE_DELAY_MS = 250

/** Monaco replaces a whole owner's markers at once, which is how a warning the
 * user has fixed disappears without anything having to track it. */
const MARKER_OWNER = 'resivo-markdown'

interface MarkdownEditorProps {
  document: ResumeDocument
  /** Warnings from the caller's parse of the last text this reported. */
  warnings: Array<ParseWarning>
  onSourceChange: (source: string) => void
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  document: resume,
  warnings,
  onSourceChange,
}) => {
  const scheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })

  const monacoRef = useRef<Monaco | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** What the model currently serializes to — the other half of the divergence
   * check below. */
  const serialized = useMemo(() => serializeDocument(resume), [resume])
  const [value, setValue] = useState(serialized)

  useEffect(() => {
    // The model changed from somewhere else — undo, the style panel, a template
    // switch — or the parse of what was typed serializes differently from how
    // it was written. Either way the buffer is stale.
    setValue((current) => (current === serialized ? current : serialized))
  }, [serialized])

  /**
   * The theme is rebuilt whenever the colour scheme changes, under one name.
   *
   * It cannot be built once for each scheme up front: the palette is read out of
   * the live computed styles, so whichever scheme is not currently applied would
   * be read as the one that is. Redefining the active theme reads the values
   * that are actually in effect.
   */
  useEffect(() => {
    const monaco = monacoRef.current

    if (monaco !== null) {
      monaco.editor.defineTheme(
        RESIVO_THEME,
        buildTheme(window.document.documentElement, scheme === 'dark'),
      )
      monaco.editor.setTheme(RESIVO_THEME)
    }
  }, [scheme])

  useEffect(() => {
    const monaco = monacoRef.current
    const model = editorRef.current?.getModel()

    if (monaco === null || model === null || model === undefined) {
      return
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
    )
  }, [warnings])

  const handleChange = (next: string | undefined) => {
    if (next === undefined) {
      return
    }

    setValue(next)

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onSourceChange(next)
    }, PARSE_DELAY_MS)
  }

  /**
   * A pending parse is flushed on unmount rather than dropped. The text is
   * already on screen, so losing it would read as the edit having been silently
   * rejected — and unmount is exactly what happens when the user switches to
   * the CSS tab.
   */
  useEffect(() => {
    const flush = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null

        const current = editorRef.current?.getValue()

        if (current !== undefined) {
          onSourceChange(current)
        }
      }
    }

    return flush
  }, [onSourceChange])

  return (
    <Editor
      beforeMount={(monaco) => {
        monacoRef.current = monaco
        monaco.editor.defineTheme(
          RESIVO_THEME,
          buildTheme(window.document.documentElement, scheme === 'dark'),
        )
      }}
      language="markdown"
      loading={<Loader size="sm" />}
      onChange={handleChange}
      onMount={(instance) => {
        editorRef.current = instance
      }}
      options={EDITOR_OPTIONS}
      theme={RESIVO_THEME}
      value={value}
    />
  )
}
