import { useMemo } from "react";
import { Box, Button, Text, Tooltip, UnstyledButton } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { useEditorStore } from "@/features/editor/store";
import {
  pageCountFor,
  useMeasuredPages,
} from "@/features/preview/measuredPages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

import { checkDocument } from "./check";
import { describeIssue } from "./describe";
import { NO_DISMISSALS, useAtsDismissals } from "./dismissals";
import { combineFixes, fixableIssues } from "./fixes";

import type { Recipe } from "@/features/editor/mutations";
import type { ResumeDocument } from "@/features/resume/model/document";
import type { AtsIssue, Severity } from "./types";

/**
 * The ATS tab of the inspector.
 *
 * Mounted only while its tab is open (the inspector's `Tabs` is
 * `keepMounted={false}`), so the check costs nothing while it is not looked at,
 * and while it is, it runs once per document change. The check is linear in the
 * number of blocks, so there is no debounce: one would only make the list lag
 * behind the paper it describes.
 *
 * The page count is the one input that is not in the document: the paper
 * measures it, and `preview/measuredPages` carries it here, tied to the
 * document it was measured for.
 *
 * Every fix goes through `apply`, the same door as every other edit, so the
 * preview updates because the store did and one undo takes a fix back.
 *
 * The checker returns rules and parameters and no sentences. They are chosen
 * here, when an issue is drawn, so switching language re-words the list without
 * checking the document again.
 */

interface AtsPanelProps {
  document: ResumeDocument;
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void;
}

/** What a severity looks like. Its name is a message, in `tab.severity`. */
const SEVERITY: Record<Severity, { icon: string; className: string }> = {
  error: { icon: "warning-circle", className: "text-danger-text" },
  warning: { icon: "warning", className: "text-warning-text" },
  info: { icon: "info", className: "text-muted" },
};

const SEVERITIES: ReadonlyArray<Severity> = ["error", "warning", "info"];

/** The key of a severity's count in the summary line, which is plural. */
const SUMMARY_KEY = {
  error: "errors",
  warning: "warnings",
  info: "infos",
} as const satisfies Record<Severity, string>;

const IssueRow: React.FC<{
  issue: AtsIssue;
  onFix: (recipe: Recipe) => void;
  onDismiss: () => void;
}> = ({ issue, onFix, onDismiss }) => {
  const { t } = useTranslation("ats");
  const severity = SEVERITY[issue.severity];
  const text = describeIssue(t, issue);

  return (
    <li className="border-line-soft flex gap-2 border-b px-3 py-2.5 last:border-b-0">
      <Icon
        className={cn("mt-0.5 flex-none", severity.className)}
        name={severity.icon}
        size={14}
        weight="fill"
      />

      <Box className="flex min-w-0 flex-1 flex-col gap-1">
        <Text className="text-body text-[12px] leading-snug">
          <Text className="sr-only" span>
            {t(`tab.severity.${issue.severity}`)}:{" "}
          </Text>
          {text.message}
        </Text>
        <Text className="text-muted text-[11px] leading-snug">{text.why}</Text>
        <Text className="text-subtle font-mono text-[10px]">{text.where}</Text>

        <Box className="mt-0.5 flex items-center gap-2">
          {issue.fix === undefined || text.fix === undefined ? null : (
            <Button
              aria-label={`${text.fix}, ${text.where}`}
              onClick={() => issue.fix !== undefined && onFix(issue.fix.recipe)}
              variant="default"
            >
              {text.fix}
            </Button>
          )}

          <Tooltip label={t("tab.dismiss")}>
            <UnstyledButton
              aria-label={t("tab.dismissIssue", { message: text.message })}
              className="text-subtle hover:text-body hover:bg-active rounded-control ml-auto flex size-[22px] items-center justify-center"
              onClick={onDismiss}
            >
              <Icon name="x" size={12} />
            </UnstyledButton>
          </Tooltip>
        </Box>
      </Box>
    </li>
  );
};

export const AtsPanel: React.FC<AtsPanelProps> = ({ document, apply }) => {
  const { t } = useTranslation("ats");
  const resumeId = useEditorStore((state) => state.resumeId) ?? "";
  const dismissed = useAtsDismissals(
    (state) => state.byResume[resumeId] ?? NO_DISMISSALS,
  );
  const dismiss = useAtsDismissals((state) => state.dismiss);
  const restoreAll = useAtsDismissals((state) => state.restoreAll);

  const measured = useMeasuredPages((state) => state.measured);
  const paperMounted = useMeasuredPages((state) => state.mounted);
  const pageCount = pageCountFor({ measured, mounted: paperMounted }, document);

  const issues = useMemo(
    () => checkDocument(document, { pageCount }),
    [document, pageCount],
  );
  const shown = useMemo(
    () => issues.filter((issue) => !dismissed.includes(issue.id)),
    [issues, dismissed],
  );

  const fixable = fixableIssues(shown);
  const hiddenCount = issues.length - shown.length;

  const summary = SEVERITIES.flatMap((severity) => {
    const n = shown.filter((issue) => issue.severity === severity).length;

    return n === 0
      ? []
      : [{ severity, text: t(`tab.${SUMMARY_KEY[severity]}`, { count: n }) }];
  });

  const fixAll = (): void => {
    const recipe = combineFixes(shown);

    if (recipe !== null) {
      apply(recipe);
    }
  };

  return (
    <Box className="flex flex-col">
      <section className="border-line-soft border-b px-3 py-3">
        {shown.length === 0 ? (
          <Box className="flex items-start gap-2">
            <Icon
              className="text-accent mt-0.5 flex-none"
              name="check-circle"
              size={16}
              weight="fill"
            />
            <Box>
              <Text className="text-body text-[12px] font-medium">
                {t("tab.clean")}
              </Text>
              <Text className="text-muted mt-0.5 text-[11px] leading-snug">
                {t("tab.disclaimer")}
              </Text>
            </Box>
          </Box>
        ) : (
          <Box className="flex items-center justify-between gap-2">
            <Text
              aria-live="polite"
              className="flex flex-wrap gap-x-2 text-[12px]"
            >
              {summary.map(({ severity, text }) => (
                <Text
                  className={cn("font-medium", SEVERITY[severity].className)}
                  component="span"
                  key={severity}
                >
                  {text}
                </Text>
              ))}
            </Text>

            {fixable.length === 0 ? null : (
              <Button
                aria-label={t("tab.fixAllLabel", { count: fixable.length })}
                onClick={fixAll}
                variant="default"
              >
                {t("tab.fixAll", { count: fixable.length })}
              </Button>
            )}
          </Box>
        )}
      </section>

      {/* Only when there is no paper on screen to ask. With one mounted the
          count is on its way, and saying "not checked" for the frame before it
          arrives would put a line in and out of the panel on every keystroke. */}
      {pageCount === null && !paperMounted ? (
        <Text
          className="text-muted border-line-soft border-b px-3 py-2 text-[11px] leading-snug"
          role="note"
        >
          {t("tab.lengthNotChecked")}
        </Text>
      ) : null}

      {shown.length === 0 ? null : (
        <ul aria-label={t("tab.issues")} className="m-0 list-none p-0">
          {shown.map((issue) => (
            <IssueRow
              issue={issue}
              key={issue.id}
              onDismiss={() => dismiss(resumeId, issue.id)}
              onFix={(recipe) => apply(recipe)}
            />
          ))}
        </ul>
      )}

      {hiddenCount === 0 ? null : (
        <Box className="border-line-soft flex items-center justify-between border-t px-3 py-2">
          <Text className="text-subtle text-[11px]">
            {t("tab.dismissed", { count: hiddenCount })}
          </Text>
          <UnstyledButton
            className="text-accent text-[11px] hover:underline"
            onClick={() => restoreAll(resumeId)}
          >
            {t("tab.showAgain")}
          </UnstyledButton>
        </Box>
      )}

      {shown.length === 0 ? null : (
        <Text className="text-subtle border-line-soft border-t px-3 py-3 text-[11px] leading-snug">
          {t("tab.disclaimer")}
        </Text>
      )}
    </Box>
  );
};
