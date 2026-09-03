import { ScrollArea, Tabs } from '@mantine/core'

import { AssetsPanel } from '@/features/assets/AssetsPanel'
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
      <Tabs.List
        aria-label="Inspector"
        className="h-titlebar border-line-soft flex-none border-b px-1"
      >
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

          <StylePanel
            apply={apply}
            design={document.design}
            locale={document.meta.locale}
          />
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
        <ScrollArea className="h-full" scrollbarSize={8} type="hover">
          <AssetsPanel apply={apply} document={document} />
        </ScrollArea>
      </Tabs.Panel>
    </Tabs>
  </aside>
)
