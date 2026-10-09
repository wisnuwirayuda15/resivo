import { ScrollArea, Tabs } from "@mantine/core";

import { AssetsPanel } from "@/features/assets/AssetsPanel";
import { AtsPanel } from "@/features/ats/AtsPanel";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/features/icons/IconRenderer";

import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";

import { StylePanel } from "./StylePanel";
import { SectionsPanel } from "./SectionsPanel";
import { TemplateSwitcher } from "./TemplateSwitcher";
import { ControlGroup } from "./controls";

import type { Recipe } from "@/features/editor/mutations";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * Panel 3, the style inspector.
 *
 * Four tabs: Style, Sections, Assets, and ATS. The first three began as the
 * design system's fixed set; the fourth is a way of reading the same document
 * rather than a fourth way of editing it, and it earned a place of its own
 * because a list of problems is not a style control and does not belong in a
 * panel of them. All four write through `apply`, so the preview is never told
 * to update: it re-renders because the store changed, exactly as it does for a
 * keystroke in the Markdown editor.
 *
 * The panel scrolls internally. Its header and tab strip stay put, because the
 * tab you are on is the one piece of state that must never scroll away.
 */

interface StyleInspectorProps {
  document: ResumeDocument;
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void;
  className?: string;
}

export const StyleInspector: React.FC<StyleInspectorProps> = ({
  document,
  apply,
  className,
}) => {
  const { t } = useTranslation("style");

  return (
    <aside
      className={cn("bg-surface flex min-h-0 flex-col", className)}
      data-tour={TOUR_TARGET_IDS.inspector}
    >
      {/* `keepMounted={false}` so an inactive tab costs nothing: the style tab
        alone is thirty controlled inputs, and none of them holds state worth
        preserving across a tab switch, every value they show lives in the
        document. It belongs on `Tabs`, not on each panel: the panel-level prop
        can only force a panel to stay mounted, never the reverse. */}
      {/* Tighter than Mantine's tab, so four fit on one row. The strip is 288px
        by default and 268px at the pane's minimum, which leaves 260px inside
        its own padding. At Mantine's 12px side padding and 6px icon gap the
        four tabs measured 306px, and the last one wrapped onto a second row
        that the next panel sat on top of. At 6px and 4px they measure about
        250px, which is the 260px less nine of slack. */}
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        classNames={{ tab: "px-1.5", tabSection: "me-1" }}
        defaultValue="style"
        keepMounted={false}
        variant="default"
      >
        <Tabs.List
          aria-label={t("inspector.label")}
          className="h-titlebar border-line-soft flex-none border-b px-1"
        >
          <Tabs.Tab
            leftSection={<Icon name="palette" size={13} />}
            value="style"
          >
            {t("inspector.style")}
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<Icon name="list-dashes" size={13} />}
            value="sections"
          >
            {t("inspector.sections")}
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<Icon name="image" size={13} />}
            value="assets"
          >
            {t("inspector.assets")}
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<Icon name="list-checks" size={13} />}
            value="ats"
          >
            {t("inspector.ats")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel className="min-h-0 flex-1" value="style">
          <ScrollArea className="h-full" scrollbarSize={8} type="hover">
            <ControlGroup title={t("template.title")}>
              <TemplateSwitcher
                apply={apply}
                design={document.design}
                kind={document.kind ?? "resume"}
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
            <SectionsPanel
              apply={apply}
              content={document.content}
              locale={document.meta.locale}
            />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1" value="assets">
          <ScrollArea className="h-full" scrollbarSize={8} type="hover">
            <AssetsPanel apply={apply} document={document} />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="min-h-0 flex-1" value="ats">
          <ScrollArea className="h-full" scrollbarSize={8} type="hover">
            <AtsPanel apply={apply} document={document} />
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
};
