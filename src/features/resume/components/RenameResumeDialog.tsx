import { useEffect, useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { useUpdateResume } from "../queries";

import type { ResumeSummary } from "@/database/index";

interface RenameResumeDialogProps {
  /** The resume being renamed, or undefined when closed. */
  resume: ResumeSummary | undefined;
  onClose: () => void;
}

export const RenameResumeDialog: React.FC<RenameResumeDialogProps> = ({
  resume,
  onClose,
}) => {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const [title, setTitle] = useState("");
  const update = useUpdateResume();

  // Seed the field whenever a different resume is opened, rather than deriving
  // it during render, the user must be able to edit it freely once it is open.
  useEffect(() => {
    if (resume !== undefined) {
      setTitle(resume.title);
    }
  }, [resume]);

  const submit = async () => {
    const trimmed = title.trim();

    if (resume === undefined || trimmed === "" || trimmed === resume.title) {
      onClose();
      return;
    }

    await update.mutateAsync({ id: resume.id, changes: { title: trimmed } });
    onClose();
  };

  return (
    <Modal
      opened={resume !== undefined}
      onClose={onClose}
      title={t("rename.title")}
      size={420}
    >
      <Stack gap="lg">
        <TextInput
          label={t("rename.name")}
          data-autofocus
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void submit()} loading={update.isPending}>
            {t("rename.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
