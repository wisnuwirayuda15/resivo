import { Text } from "@mantine/core";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

import type { FontSummary, ImageSummary } from "@/database/index";

/**
 * The two asset deletions.
 *
 * Both say what breaks, not just that the action cannot be undone: a resume
 * still pointing at a deleted image shows a missing-image box, and one set in a
 * deleted font prints in a fallback face, which moves its page breaks. Nothing
 * here is deleted automatically for the same reason, since an asset can be
 * unreferenced simply because it has not been placed yet.
 */

interface DeleteImageDialogProps {
  image: ImageSummary | null;
  unused: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteImageDialog: React.FC<DeleteImageDialogProps> = ({
  image,
  unused,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation("assets");

  return (
    <ConfirmDialog
      confirmLabel={t("dialogs.deleteImage.confirm")}
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
      opened={image !== null}
      title={t("dialogs.deleteImage.title", {
        name: image?.name ?? t("dialogs.deleteImage.fallbackName"),
      })}
    >
      <Text className="text-[13px]">
        {image !== null && !unused
          ? t("dialogs.deleteImage.inUse")
          : t("dialogs.deleteImage.unused")}
      </Text>
    </ConfirmDialog>
  );
};

interface DeleteFontDialogProps {
  font: FontSummary | null;
  unused: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteFontDialog: React.FC<DeleteFontDialogProps> = ({
  font,
  unused,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation("assets");

  return (
    <ConfirmDialog
      confirmLabel={t("dialogs.deleteFont.confirm")}
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
      opened={font !== null}
      title={t("dialogs.deleteFont.title", {
        name: font?.family ?? t("dialogs.deleteFont.fallbackName"),
      })}
    >
      <Text className="text-[13px]">
        {font !== null && !unused
          ? t("dialogs.deleteFont.inUse")
          : t("dialogs.deleteFont.unused")}
      </Text>
    </ConfirmDialog>
  );
};
