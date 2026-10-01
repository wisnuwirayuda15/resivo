import { Box, Loader, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { seo } from "@/lib/seo";

import { ClientOnly } from "@/components/client-only";
import { Shell } from "@/components/shell/Shell";
import { BackupPanel } from "@/features/backup/BackupPanel";
import { InstallPanel } from "@/features/pwa/InstallPanel";
import { LanguagePanel } from "@/features/settings/LanguagePanel";
import { StoragePanel } from "@/features/settings/StoragePanel";

/**
 * Settings.
 *
 * Three things, and they are the three questions about a local-first app that
 * are not about any one document: what happens if this laptop is lost, how much
 * of the device is this using, and can it be kept here rather than fetched.
 */
const SettingsRoute: React.FC = () => {
  const { t } = useTranslation("settings");

  return (
    <Shell title="Settings">
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
            Backup and restore
          </Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            Everything Resivo stores lives in this browser, on this device.
            There is no copy anywhere else, so a backup is the only thing that
            survives a cleared browser or a lost machine.
          </Text>
        </Box>

        {/* Client-only: reading the database and writing a file both need a
          browser, and this page is nothing but those two things. */}
        <ClientOnly
          fallback={
            <Box className="flex py-6">
              <Loader size="sm" />
            </Box>
          }
        >
          <BackupPanel />
        </ClientOnly>

        <Box className="border-line-soft border-t pt-6">
          <Text className="text-body text-[15px] font-medium">Storage</Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            Every image and font is stored once and shared by every resume on
            this device.
          </Text>

          <Box className="mt-4">
            <ClientOnly
              fallback={
                <Box className="flex py-6">
                  <Loader size="sm" />
                </Box>
              }
            >
              <StoragePanel />
            </ClientOnly>
          </Box>
        </Box>

        <Box className="border-line-soft border-t pt-6">
          <Text className="text-body text-[15px] font-medium">
            Install on this device
          </Text>
          <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
            Resivo can be installed like any other application, and once it is
            cached it opens whether or not there is a network.
          </Text>

          <Box className="mt-4">
            {/* Client-only for the same reason as the two above: every answer
              here comes from the browser (whether it has offered an install,
              whether a worker is controlling the page) and none of them exists
              on the server. */}
            <ClientOnly
              fallback={
                <Box className="flex py-6">
                  <Loader size="sm" />
                </Box>
              }
            >
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
