import { useState } from "react";
import { Box, Loader, Text } from "@mantine/core";

import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { AssetUpload, UploadError } from "./components/AssetUpload";
import { DeleteFontDialog } from "./components/deleteDialogs";
import { FontCard } from "./components/FontCard";
import { FONT_ACCEPT } from "./readFont";
import { formatBytes } from "./format";
import { useAddFont, useDeleteFont, useFonts, useUnusedFonts } from "./queries";

import type { FontSummary } from "@/database/index";

/**
 * Uploaded fonts, as a page of its own.
 *
 * Like the image route, this one used to be a hardcoded empty state that never
 * read the database. There is no assignment here, which face a resume is set in
 * belongs to that resume, and is chosen in its style inspector. This page is
 * about the files: what is stored, what it costs, and what nothing uses.
 */
export const FontManagerView: React.FC = () => {
  const { t } = useTranslation("assets");
  const { data: fonts, isPending } = useFonts();
  const { data: unused } = useUnusedFonts();
  const add = useAddFont();
  const remove = useDeleteFont();

  const [confirming, setConfirming] = useState<FontSummary | null>(null);

  const all = fonts ?? [];
  const unusedIds = new Set((unused ?? []).map((font) => font.id));
  const totalBytes = all.reduce((sum, font) => sum + font.size, 0);

  return (
    <Box className="p-6">
      <Text className="text-muted mb-5 max-w-[70ch] text-[13px] leading-normal">
        {t("fontsPage.intro")}
      </Text>

      <Box className="mb-4 flex flex-wrap items-center gap-3">
        <AssetUpload
          accept={FONT_ACCEPT}
          label={t("fonts.add")}
          loading={add.isPending}
          onFile={(file) => add.mutate(file)}
        />

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {t("fontsPage.stats", {
            count: all.length,
            size: formatBytes(totalBytes),
            unused: unusedIds.size,
          })}
        </Text>
      </Box>

      <UploadError className="mb-4" error={add.error} />

      {isPending ? (
        <Box className="flex justify-center py-20">
          <Loader size="sm" />
        </Box>
      ) : all.length === 0 ? (
        <EmptyState
          body={t("fontsPage.emptyBody")}
          icon="text-aa"
          title={t("fontsPage.emptyTitle")}
        />
      ) : (
        <Box className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {all.map((font) => (
            <FontCard
              font={font}
              key={font.id}
              onDelete={() => setConfirming(font)}
              unused={unusedIds.has(font.id)}
            />
          ))}
        </Box>
      )}

      <DeleteFontDialog
        font={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming !== null) {
            remove.mutate(confirming.id);
          }

          setConfirming(null);
        }}
        unused={confirming !== null && unusedIds.has(confirming.id)}
      />
    </Box>
  );
};
