import { Box, Tooltip, UnstyledButton } from "@mantine/core";
import { useOs } from "@mantine/hooks";

import { Icon } from "@/features/icons/IconRenderer";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { useEditorStore } from "./store";

import type { ComponentProps } from "react";

/**
 * Undo and redo for the document.
 *
 * The store has kept a history since the editor existed, one entry per change,
 * with consecutive edits under the same coalesce key merged so a typed sentence
 * is one step. Nothing reached it: there was no button and no shortcut, which
 * made every slider in the style panel and every edit on the paper a one-way
 * change.
 *
 * This is deliberately the document's history, not a text buffer's. Monaco keeps
 * its own undo stack for the pane it owns, and the keyboard shortcut is left to
 * it while the caret is in it, see `useDocumentHistoryShortcuts`. The buttons
 * always act on the document, whatever has focus.
 */

interface HistoryButtonProps extends ComponentProps<"button"> {
  icon: string;
  label: string;
}

/**
 * Same contract as the app bar's `BarButton`, and for the same reason: Tooltip
 * clones its child and injects the props that make it open, so a button that
 * declares only its own four props drops them and never shows a tooltip. The
 * injected `className` is empty here, the classes live inside the component,
 * so it is merged rather than spread over.
 */
const HistoryButton = ({
  icon,
  label,
  className,
  ref,
  ...rest
}: HistoryButtonProps) => (
  <UnstyledButton
    ref={ref}
    aria-label={label}
    component="button"
    {...rest}
    className={cn(
      "text-muted hover:bg-hover hover:text-body rounded-control duration-fast ease-standard flex h-[30px] w-[30px] items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40",
      className,
    )}
  >
    <Icon name={icon} size={16} />
  </UnstyledButton>
);

export const HistoryControls: React.FC = () => {
  const { t } = useTranslation("editor");
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  // Called in the selector rather than read as a field: both are derived from
  // the history arrays, and a boolean is a stable enough result to subscribe to.
  const canUndo = useEditorStore((state) => state.canUndo());
  const canRedo = useEditorStore((state) => state.canRedo());

  // The label has to name the right key or it is worse than no label. `useOs`
  // resolves on the client only, which is fine: this whole control is client-only.
  const modifier = useOs() === "macos" ? "⌘" : "Ctrl+";

  return (
    /* One control group, and the tour points at the pair, each button is a
       Tooltip child, and Tooltip works by cloning what it wraps. */
    <Box
      className="flex items-center gap-0.5"
      data-tour={TOUR_TARGET_IDS.history}
    >
      <Tooltip label={t("history.undo", { shortcut: `${modifier}Z` })}>
        <HistoryButton
          disabled={!canUndo}
          icon="arrow-u-up-left"
          label={t("history.undo", { shortcut: `${modifier}Z` })}
          onClick={undo}
        />
      </Tooltip>
      <Tooltip label={t("history.redo", { shortcut: `${modifier}⇧Z` })}>
        <HistoryButton
          disabled={!canRedo}
          icon="arrow-u-up-right"
          label={t("history.redo", { shortcut: `${modifier}⇧Z` })}
          onClick={redo}
        />
      </Tooltip>
    </Box>
  );
};
