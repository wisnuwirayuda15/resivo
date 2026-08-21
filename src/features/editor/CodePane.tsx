import { Suspense, lazy, useState } from 'react'
import { Box, Loader, Tabs, Text } from '@mantine/core'

import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/features/icons/IconRenderer'
import { cn } from '@/lib/utils'

import type { ParseWarning } from '@/features/markdown/index'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * Panel 1 — the code pane.
 *
 * Monaco is loaded lazily and only here. It is by far the largest thing in the
 * bundle, and someone who only ever edits in the preview or the style panel
 * should never pay for it — so it is a separate chunk fetched when this pane
 * first mounts, not part of the app's entry.
 */
const MarkdownEditor = lazy(() =>
  import('./MarkdownEditor').then((module) => ({
    default: module.MarkdownEditor,
  })),
)

interface CodePaneProps {
  document: ResumeDocument
  warnings: Array<ParseWarning>
  onSourceChange: (source: string) => void
  className?: string
}

const EditorFallback: React.FC = () => (
  <Box className="flex h-full items-center justify-center">
    <Loader size="sm" />
  </Box>
)

export const CodePane: React.FC<CodePaneProps> = ({
  document: resume,
  warnings,
  onSourceChange,
  className,
}) => {
  const [tab, setTab] = useState<string | null>('markdown')

  return (
    <Box className={cn('bg-code flex min-h-0 flex-col', className)}>
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        keepMounted={false}
        onChange={setTab}
        value={tab}
      >
        <Tabs.List className="h-titlebar border-line-soft bg-surface flex-none border-b px-1">
          <Tabs.Tab
            leftSection={<Icon name="markdown-logo" size={13} />}
            value="markdown"
          >
            resume.md
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<Icon name="file-css" size={13} />}
            value="css"
          >
            style.css
          </Tabs.Tab>

          {/* The count, not the messages: a warning is explained where it
              happened, by the squiggle under the line. This is only the hint
              that there is something to look at on a tab you cannot see. */}
          {warnings.length === 0 ? null : (
            <Text
              className="text-warning-text ml-auto self-center pr-2 font-mono text-[11px] tabular-nums"
              span
            >
              {warnings.length} {warnings.length === 1 ? 'notice' : 'notices'}
            </Text>
          )}
        </Tabs.List>

        <Tabs.Panel className="min-h-0 flex-1" value="markdown">
          <Suspense fallback={<EditorFallback />}>
            <MarkdownEditor
              document={resume}
              onSourceChange={onSourceChange}
              warnings={warnings}
            />
          </Suspense>
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1" value="css">
          {/* The tab is here because the pane's shape should settle once. The
              editor behind it waits for the sanitizer — shipping a CSS box that
              writes straight into the preview would be shipping the hole before
              the feature. */}
          <EmptyState
            body="Custom CSS is checked before it reaches the paper, and that check is not built yet. Use the Style tab for now."
            icon="file-css"
            title="Not ready yet"
          />
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
