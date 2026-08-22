import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Loader, useComputedColorScheme } from '@mantine/core'

import { sanitizeCss } from '@/features/css/sanitize'

import { EDITOR_OPTIONS, RESIVO_THEME, buildTheme } from './monaco'

import type { editor } from 'monaco-editor'
import type { Monaco } from '@monaco-editor/react'

/**
 * The `style.css` tab.
 *
 * Simpler than the Markdown tab in one important way: CSS is stored as the text
 * the user wrote, not derived from a model, so there is no serialization to
 * diverge from and no reason to ever replace the buffer from outside. The only
 * thing this has to get right is not writing to the document on every keystroke.
 *
 * What it does not do is sanitize on the way in. The document keeps the source
 * verbatim and the preview sanitizes on the way out, so tightening the rules
 * later applies to every existing resume rather than only to what is edited
 * afterwards — and a rule the user is midway through typing is not silently
 * rewritten under the caret.
 */

const SAVE_DELAY_MS = 300

const MARKER_OWNER = 'resivo-css'

interface CssEditorProps {
  css: string
  onChange: (css: string) => void
  /** Reports how many rules were refused, for the tab strip. */
  onRefusalCount?: (count: number) => void
}

export const CssEditor: React.FC<CssEditorProps> = ({
  css,
  onChange,
  onRefusalCount,
}) => {
  const scheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })

  const monacoRef = useRef<Monaco | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [value, setValue] = useState(css)

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

  /**
   * Markers come from the sanitizer, not from Monaco's CSS service.
   *
   * Monaco already flags syntax; what it cannot know is which valid CSS this
   * preview refuses and why. Those are the messages worth showing, because a
   * refused rule is otherwise invisible — the paper simply does not change.
   */
  useEffect(() => {
    const monaco = monacoRef.current
    const model = editorRef.current?.getModel()
    const { warnings } = sanitizeCss(value)

    onRefusalCount?.(warnings.length)

    if (monaco === null || model === null || model === undefined) {
      return
    }

    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      warnings.map((warning) => ({
        severity: monaco.MarkerSeverity.Warning,
        message: warning.message,
        startLineNumber: warning.line,
        startColumn: warning.column,
        endLineNumber: warning.line,
        endColumn: model.getLineMaxColumn(warning.line),
      })),
    )
  }, [value, onRefusalCount])

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
      onChange(next)
    }, SAVE_DELAY_MS)
  }

  /** Flushed on unmount, which is what happens when the user switches tabs. */
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null

        const current = editorRef.current?.getValue()

        if (current !== undefined) {
          onChange(current)
        }
      }
    },
    [onChange],
  )

  return (
    <Editor
      beforeMount={(monaco) => {
        monacoRef.current = monaco
        monaco.editor.defineTheme(
          RESIVO_THEME,
          buildTheme(window.document.documentElement, scheme === 'dark'),
        )
      }}
      language="css"
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
