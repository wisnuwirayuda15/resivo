import { useState } from "react";
import { Box, Button, Loader, SegmentedControl, Text } from "@mantine/core";

import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { AssetNameInput } from "./components/AssetNameInput";
import { AssetUpload, UploadError } from "./components/AssetUpload";
import { DeleteImageDialog } from "./components/deleteDialogs";
import { Thumb } from "./components/Thumb";
import { IMAGE_ACCEPT } from "./readImage";
import { formatBytes } from "./format";
import {
  useAddImage,
  useDeleteImage,
  useImages,
  useRenameImage,
  useUnusedImages,
} from "./queries";

import type { ImageSummary } from "@/database/index";

/**
 * The image gallery, as a page of its own.
 *
 * This route existed as a hardcoded empty state that never read the database, so
 * it reported "No images yet" to anyone who had uploaded through the editor's
 * Assets tab. The gallery in the inspector is the same data with a different
 * job: there, an image is being placed into the document in front of it, so it
 * carries a section picker and a selection. Here there is no document, so the
 * page is about the library itself, what is stored, what it costs, and what
 * nothing refers to any more.
 */
export const ImageGalleryView: React.FC = () => {
  const { t } = useTranslation("assets");
  const { data: images, isPending } = useImages();
  const { data: unused } = useUnusedImages();
  const add = useAddImage();
  const rename = useRenameImage();
  const remove = useDeleteImage();

  const [filter, setFilter] = useState<"all" | "unused">("all");
  const [confirming, setConfirming] = useState<ImageSummary | null>(null);

  const all = images ?? [];
  const unusedIds = new Set((unused ?? []).map((image) => image.id));
  const visible =
    filter === "all" ? all : all.filter((image) => unusedIds.has(image.id));
  const totalBytes = all.reduce((sum, image) => sum + image.size, 0);

  return (
    <Box className="p-6">
      <Text className="text-muted mb-5 max-w-[70ch] text-[13px] leading-normal">
        {t("imagesPage.intro")}
      </Text>

      <Box className="mb-4 flex flex-wrap items-center gap-3">
        <AssetUpload
          accept={IMAGE_ACCEPT}
          label={t("images.add")}
          loading={add.isPending}
          onFile={(file) => add.mutate(file)}
        />

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {t("imagesPage.stats", {
            count: all.length,
            size: formatBytes(totalBytes),
            unused: unusedIds.size,
          })}
        </Text>

        <Box className="flex-1" />

        {all.length === 0 ? null : (
          <SegmentedControl
            aria-label={t("imagesPage.filter")}
            data={[
              { value: "all", label: t("imagesPage.filterAll") },
              { value: "unused", label: t("imagesPage.filterUnused") },
            ]}
            onChange={(value) =>
              setFilter(value === "unused" ? "unused" : "all")
            }
            size="xs"
            value={filter}
          />
        )}
      </Box>

      <UploadError className="mb-4" error={add.error} />

      {isPending ? (
        <Box className="flex justify-center py-20">
          <Loader size="sm" />
        </Box>
      ) : all.length === 0 ? (
        <EmptyState
          body={t("imagesPage.emptyBody")}
          icon="image"
          title={t("imagesPage.emptyTitle")}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          body={t("imagesPage.nothingUnusedBody")}
          icon="check-circle"
          title={t("imagesPage.nothingUnusedTitle")}
        />
      ) : (
        <Box className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {visible.map((image) => (
            <Box className="flex flex-col gap-2" key={image.id}>
              <Box className="aspect-[4/3]">
                <Thumb image={image} />
              </Box>

              <AssetNameInput
                aria-label={t("imagesPage.nameOf", { name: image.name })}
                onCommit={(name) => rename.mutate({ id: image.id, name })}
                value={image.name}
              />

              <Box className="flex items-center justify-between gap-2">
                <Text
                  className="text-subtle truncate font-mono text-[10px] tabular-nums"
                  span
                >
                  {t(
                    unusedIds.has(image.id)
                      ? "imagesPage.metaUnused"
                      : "imagesPage.meta",
                    {
                      width: image.width,
                      height: image.height,
                      size: formatBytes(image.size),
                    },
                  )}
                </Text>
                <Button
                  color="red"
                  onClick={() => setConfirming(image)}
                  size="compact-xs"
                  variant="subtle"
                >
                  {t("images.delete")}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <DeleteImageDialog
        image={confirming}
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
