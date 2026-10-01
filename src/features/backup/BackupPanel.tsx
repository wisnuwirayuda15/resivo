import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Code,
  FileButton,
  List,
  Loader,
  Text,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

import { Icon } from "@/features/icons/IconRenderer";
import { downloadBlob } from "@/lib/download";
import { Trans, useErrorText, useTranslation } from "@/lib/i18n/useTranslation";

import { createBackup, restoreBackup } from "./backup";
import { parseBackup } from "./format";

import type { TFunction } from "i18next";
import type { RestoreReport } from "./backup";

/**
 * Backup and restore.
 *
 * This is the only way data leaves the device, and the only way it comes back,
 * so both directions say plainly what they do. The restore in particular is
 * explicit that it *adds*: a user reaching for a backup usually has something
 * already broken, and the one outcome that must be impossible is a restore that
 * takes away what is still there.
 */

/**
 * What a restore did, one line for each thing it did.
 *
 * Takes `t` so it stays a plain function of the report: a count of zero is not
 * a line, and the plural of each noun is the message's, not this file's.
 */
const summarise = (
  report: RestoreReport,
  t: TFunction<"settings">,
): Array<string> => {
  const lines: Array<string> = [];

  if (report.resumesAdded > 0) {
    const restored = t("backup.summary.resumes", {
      count: report.resumesAdded,
    });

    lines.push(
      report.resumesRenumbered > 0
        ? `${restored} ${t("backup.summary.alongside", { count: report.resumesRenumbered })}`
        : restored,
    );
  }

  const counted = [
    ["groups", report.groupsAdded],
    ["images", report.imagesAdded],
    ["imagesPresent", report.imagesAlreadyPresent],
    ["fonts", report.fontsAdded],
    ["fontsPresent", report.fontsAlreadyPresent],
    ["settings", report.settingsAdded],
  ] as const;

  for (const [key, count] of counted) {
    if (count > 0) {
      lines.push(t(`backup.summary.${key}`, { count }));
    }
  }

  return lines.length === 0 ? [t("backup.summary.empty")] : lines;
};

export const BackupPanel: React.FC = () => {
  const { t } = useTranslation("settings");
  const errorText = useErrorText();
  const client = useQueryClient();

  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [failed, setFailed] = useState<{
    cause: unknown;
    during: "backup" | "restore";
  } | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);

  const download = async () => {
    setBusy("backup");
    setFailed(null);

    try {
      const now = Date.now();
      const backup = await createBackup(now);
      const stamp = new Date(now).toISOString().slice(0, 10);

      downloadBlob(
        // Indented, because a backup a user cannot read is a backup they cannot
        // check. The size cost is compression's problem, not theirs.
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
        `resivo-backup-${stamp}.json`,
      );
    } catch (cause) {
      setFailed({ cause, during: "backup" });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (file: File) => {
    setBusy("restore");
    setFailed(null);
    setReport(null);

    try {
      const parsed = parseBackup(await file.text());

      setReport(await restoreBackup(parsed, Date.now()));
      // Everything the library and the asset panels show has changed underneath
      // them.
      await client.invalidateQueries();
    } catch (cause) {
      setFailed({ cause, during: "restore" });
    } finally {
      setBusy(null);
    }
  };

  /**
   * The error is kept as the thing that was thrown, and worded here, so a refusal
   * raised in one language reads in the language the screen is in now. Which
   * fallback it gets depends on what was being attempted.
   */
  const failure = (): string =>
    failed === null
      ? ""
      : errorText(
          failed.cause,
          failed.during === "backup"
            ? t("backup.writeFailed")
            : t("backup.restoreFailed"),
        );

  return (
    <Box className="flex max-w-[62ch] flex-col gap-6">
      <Box>
        <Text className="text-body text-[14px] font-medium">
          {t("backup.backUp")}
        </Text>
        <Text className="text-muted mt-1 text-[13px]">
          {t("backup.backUpBody")}
        </Text>

        <Button
          className="mt-3"
          leftSection={<Icon name="download-simple" size={14} />}
          loading={busy === "backup"}
          onClick={() => void download()}
          size="xs"
          variant="default"
        >
          {t("backup.download")}
        </Button>
      </Box>

      <Box>
        <Text className="text-body text-[14px] font-medium">
          {t("backup.restore")}
        </Text>
        <Text className="text-muted mt-1 text-[13px]">
          <Trans
            components={{ code: <Code className="text-[12px]" /> }}
            i18nKey="backup.restoreBody"
            t={t}
          />
        </Text>

        <FileButton
          accept="application/json,.json"
          onChange={(file) => file && void restore(file)}
        >
          {(props) => (
            <Button
              {...props}
              className="mt-3"
              leftSection={<Icon name="upload-simple" size={14} />}
              loading={busy === "restore"}
              size="xs"
              variant="default"
            >
              {t("backup.choose")}
            </Button>
          )}
        </FileButton>
      </Box>

      {busy === "restore" ? (
        <Box className="flex items-center gap-2">
          <Loader size={14} />
          <Text className="text-muted text-[12px]">
            {t("backup.restoring")}
          </Text>
        </Box>
      ) : null}

      {failed === null ? null : (
        <Alert
          color="red"
          icon={<Icon name="warning" size={14} />}
          title={t("backup.failedTitle")}
          variant="light"
        >
          <Text className="text-[12px]">{failure()}</Text>
        </Alert>
      )}

      {report === null ? null : (
        <Alert
          color="teal"
          icon={<Icon name="check-circle" size={14} />}
          title={t("backup.restoredTitle")}
          variant="light"
        >
          <List className="text-[12px]" size="xs" spacing={2}>
            {summarise(report, t).map((line) => (
              <List.Item key={line}>{line}</List.Item>
            ))}
          </List>
        </Alert>
      )}
    </Box>
  );
};
