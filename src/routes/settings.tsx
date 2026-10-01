import { Box, Loader, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { seo } from "@/lib/seo";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { ClientOnly } from "@/components/client-only";
import { Shell } from "@/components/shell/Shell";
import { BackupPanel } from "@/features/backup/BackupPanel";
import { InstallPanel } from "@/features/pwa/InstallPanel";
import { LanguagePanel } from "@/features/settings/LanguagePanel";
import { StoragePanel } from "@/features/settings/StoragePanel";

/**
 * Settings.
 *
 * The questions about a local-first app that are not about any one document:
 * what language it speaks, what happens if this laptop is lost, how much of the
 * device is this using, and can it be kept here rather than fetched.
 */
const Pending: React.FC = () => (
  <Box className="flex py-6">
    <Loader size="sm" />
  </Box>
);

const SettingsRoute: React.FC = () => {
  const { t } = useTranslation("settings");
  const { t: tShell } = useTranslation("shell");

  return (
    <Shell title={tShell("sidebar.settings")}>
      <Box className="flex flex-col gap-6 p-6">
        <Box>
          <Text className="text-body text-[15px] font-medium">
            {t("language.title")}
          </Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            {t("language.description")}
          </Text>

          <Box className="mt-4">
            <LanguagePanel />
          </Box>
        </Box>

        <Box className="border-line-soft border-t pt-6">
          <Text className="text-body text-[15px] font-medium">
            {t("backup.title")}
          </Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            {t("backup.intro")}
          </Text>
        </Box>

        {/* Client-only: reading the database and writing a file both need a
          browser, and this page is nothing but those two things. */}
        <ClientOnly fallback={<Pending />}>
          <BackupPanel />
        </ClientOnly>

        <Box className="border-line-soft border-t pt-6">
          <Text className="text-body text-[15px] font-medium">
            {t("storage.title")}
          </Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            {t("storage.intro")}
          </Text>

          <Box className="mt-4">
            <ClientOnly fallback={<Pending />}>
              <StoragePanel />
            </ClientOnly>
          </Box>
        </Box>

        <Box className="border-line-soft border-t pt-6">
          <Text className="text-body text-[15px] font-medium">
            {t("install.title")}
          </Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            {t("install.intro")}
          </Text>

          <Box className="mt-4">
            {/* Client-only for the same reason as the two above: every answer
              here comes from the browser (whether it has offered an install,
              whether a worker is controlling the page) and none of them exists
              on the server. */}
            <ClientOnly fallback={<Pending />}>
              <InstallPanel />
            </ClientOnly>
          </Box>
        </Box>
      </Box>
    </Shell>
  );
};

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: seo({
      title: "Settings | Resivo",
      indexable: false,
    }),
  }),
  component: SettingsRoute,
});
