import { ScrollArea, Tabs } from '@mantine/core'

import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { Icon } from '@/features/icons/IconRenderer'

import { StylePanel } from './StylePanel'
import { SectionsPanel } from './SectionsPanel'
import { TemplateSwitcher } from './TemplateSwitcher'
import { ControlGroup } from './controls'

import type { Recipe } from '@/features/editor/mutations'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * Panel 3 — the style inspector.
 *
 * Three tabs, fixed by the design system: Style, Sections, Assets. Each is a
 * different way of editing the same document, and all three write through
 * `apply`, so the preview is never told to update — it re-renders because the
 * store changed, exactly as it does for a keystroke in the Markdown editor.
 *
 * The panel scrolls internally. Its header and tab strip stay put, because the
 * tab you are on is the one piece of state that must never scroll away.
 */

interface StyleInspectorProps {
  document: ResumeDocument
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
  className?: string
}

export const StyleInspector: React.FC<StyleInspectorProps> = ({
  document,
  apply,
  className,
}) => (
  <aside className={cn('bg-surface flex min-h-0 flex-col', className)}>
    {/* `keepMounted={false}` so an inactive tab costs nothing: the style tab
        alone is thirty controlled inputs, and none of them holds state worth
        preserving across a tab switch — every value they show lives in the
        document. It belongs on `Tabs`, not on each panel: the panel-level prop
        can only force a panel to stay mounted, never the reverse. */}
    <Tabs
      className="flex min-h-0 flex-1 flex-col"
      defaultValue="style"
      keepMounted={false}
      variant="default"
    >
      <Tabs.List className="h-titlebar border-line-soft flex-none border-b px-1">
        <Tabs.Tab leftSection={<Icon name="palette" size={13} />} value="style">
          Style
        </Tabs.Tab>
        <Tabs.Tab
          leftSection={<Icon name="list-dashes" size={13} />}
          value="sections"
        >
          Sections
        </Tabs.Tab>
        <Tabs.Tab leftSection={<Icon name="image" size={13} />} value="assets">
          Assets
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel className="min-h-0 flex-1" value="style">
        <ScrollArea className="h-full" scrollbarSize={8} type="hover">
          <ControlGroup title="Template">
            <TemplateSwitcher
              apply={apply}
              design={document.design}
              templateId={document.templateId}
            />
          </ControlGroup>

          <StylePanel apply={apply} design={document.design} />
        </ScrollArea>
      </Tabs.Panel>

      <Tabs.Panel
        className="min-h-0 flex-1"

        value="sections"
      >
        <ScrollArea className="h-full" scrollbarSize={8} type="hover">
          <SectionsPanel apply={apply} content={document.content} />
        </ScrollArea>
      </Tabs.Panel>

      <Tabs.Panel className="min-h-0 flex-1" value="assets">
        {/**
         * The tab exists now, empty, on purpose: it is where images and fonts
         * will be picked, and settling the panel's shape once means the controls
         * beside it do not move when that lands. Saying so is better than
         * hiding the tab and having it appear later where something else was.
         */}
        <EmptyState
          body="Images and custom fonts are stored on this device and picked from here. That library is not built yet."
          icon="image"
          title="No assets yet"
        />
      </Tabs.Panel>
    </Tabs>
  </aside>
)
