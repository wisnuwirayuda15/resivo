import { Suspense, lazy, useCallback, useState } from "react";
import { Box, Loader, Tabs, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";

import { GuideLink } from "./GuideLink";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

import type { ParseWarning } from "@/features/markdown/index";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * Panel 1, the code pane.
 *
 * Monaco is loaded lazily and only here. It is by far the largest thing in the
 * bundle, and someone who only ever edits in the preview or the style panel
 * should never pay for it, so it is a separate chunk fetched when this pane
 * first mounts, not part of the app's entry. Both tabs share that chunk, since
 * both are the same editor with a different language.
 */
const MarkdownEditor = lazy(() =>
  import("./MarkdownEditor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);

const CssEditor = lazy(() =>
  import("./CssEditor").then((module) => ({ default: module.CssEditor })),
);

interface CodePaneProps {
  document: ResumeDocument;
  warnings: Array<ParseWarning>;
  onSourceChange: (source: string) => void;
  onCustomCssChange: (css: string) => void;
  className?: string;
}

const EditorFallback: React.FC = () => (
  <Box className="flex h-full items-center justify-center">
    <Loader size="sm" />
  </Box>
);

export const CodePane: React.FC<CodePaneProps> = ({
  document: resume,
  warnings,
  onSourceChange,
  onCustomCssChange,
  className,
}) => {
  const { t } = useTranslation("editor");
  const [tab, setTab] = useState<string | null>("markdown");
  const [refusals, setRefusals] = useState(0);

  /** Stable, so reporting a count does not re-run the editor's marker effect. */
  const handleRefusals = useCallback((count: number) => setRefusals(count), []);

  /**
   * One count for whichever tab is not showing.
   *
   * A squiggle explains itself where it happens, so the strip carries only the
   * number, and only the number belonging to the *other* tab would be useful,
   * except that tracking which is which costs more than it tells the reader. The
   * count is therefore the total, and the tab it belongs to is one click away.
   */
  const notices = warnings.length + refusals;

  return (
    <OnboardingTour.Target id={TOUR_TARGET_IDS.code}>
      <Box className={cn("bg-code flex min-h-0 flex-col", className)}>
        <Tabs
          className="flex min-h-0 flex-1 flex-col"
          keepMounted={false}
          onChange={setTab}
          value={tab}
        >
          <Tabs.List
            aria-label={t("code.sourceFiles")}
            className="h-titlebar border-line-soft bg-surface flex-none border-b px-1"
          >
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

            {/* The right end of the strip: the notice count when there is one,
                and the way into the guide, which is always there. */}
            <Box className="ml-auto flex items-center gap-2 self-center pr-1">
              {notices === 0 ? null : (
                <Text
                  className="text-warning-text font-mono text-[11px] tabular-nums"
                  span
                >
                  {t("code.notices", { count: notices })}
                </Text>
              )}
              <GuideLink />
            </Box>
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
            <Suspense fallback={<EditorFallback />}>
              <CssEditor
                css={resume.customCss}
                onChange={onCustomCssChange}
                onRefusalCount={handleRefusals}
              />
            </Suspense>
          </Tabs.Panel>
        </Tabs>
      </Box>
    </OnboardingTour.Target>
  );
};
