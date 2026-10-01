import { useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { useCreateGroup } from "../queries";

interface NewGroupDialogProps {
  opened: boolean;
  onClose: () => void;
}

export const NewGroupDialog: React.FC<NewGroupDialogProps> = ({
  opened,
  onClose,
}) => {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const [name, setName] = useState("");
  const createGroup = useCreateGroup();

  const close = () => {
    onClose();
    setName("");
  };

  const submit = async () => {
    const trimmed = name.trim();

    if (trimmed === "") {
      return;
    }

    await createGroup.mutateAsync(trimmed);
    close();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={t("group.newTitle")}
      size={420}
    >
      <Stack gap="lg">
        <TextInput
          label={t("group.name")}
          placeholder={t("group.placeholder")}
          data-autofocus
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={close}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            loading={createGroup.isPending}
            disabled={name.trim() === ""}
          >
            {t("group.create")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
