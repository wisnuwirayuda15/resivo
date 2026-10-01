import { Box, Text, Tooltip } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { Icon } from "@/features/icons/IconRenderer";
import { cn } from "@/lib/utils";

import { useEditorStore } from "./store";

import type { SaveStatus } from "./autosave";

/**
 * Whether the open resume is written down yet.
 *
 * Autosave has always worked and has never said so, which in a local-first app
 * is the wrong silence to keep: there is no server to blame and no "sync"
 * anyone can check, so the only evidence a user has that their work survives
 * closing the tab is this line. It was missing, and the report that arrived was
 * "it sometimes does not save when I leave the editor".
 *
 * Reads the store directly rather than taking a prop. The status changes on
 * every burst of typing, and threading it through the route would re-render the
 * editor (Monaco, the iframe, the inspector) twice per save. A Zustand
 * selector re-renders this and nothing else.
 */

/**
 * What each status looks like. The words are in the `editor` namespace under
 * the status's own name, and say where, because "saved" in an app with no
 * account invites the question.
 */
const REPORTS: Record<SaveStatus, { icon: string; className: string }> = {
  saved: { icon: "check-circle", className: "text-subtle" },
  saving: { icon: "circle-dashed", className: "text-muted" },
  error: { icon: "warning-circle", className: "text-[var(--danger-text)]" },
};

export const SaveIndicator: React.FC = () => {
  const { t } = useTranslation("editor");
  const status = useEditorStore((state) => state.saveStatus);
  const report = REPORTS[status];

  return (
    <Tooltip label={t(`save.${status}.detail`)} multiline w={260}>
      {/* A fixed width, so the row does not shift as the word changes. Three
          labels of three different lengths in a 44px bar would nudge everything
          beside them on every keystroke. */}
      <Box
        aria-live="polite"
        className={cn(
          "flex w-[72px] flex-none items-center gap-1.5 text-[11px]",
          report.className,
        )}
        role="status"
      >
        <Icon name={report.icon} size={13} />
        <Text className="truncate" span>
          {t(`save.${status}.label`)}
        </Text>
      </Box>
    </Tooltip>
  );
};
