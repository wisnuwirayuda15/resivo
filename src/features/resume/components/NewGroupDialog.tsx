import { useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";

import { useCreateGroup } from "../queries";

interface NewGroupDialogProps {
  opened: boolean;
  onClose: () => void;
}

export const NewGroupDialog: React.FC<NewGroupDialogProps> = ({
  opened,
  onClose,
}) => {
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
    <Modal opened={opened} onClose={close} title="New group" size={420}>
      <Stack gap="lg">
        <TextInput
          label="Name"
          placeholder="Applications"
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
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            loading={createGroup.isPending}
            disabled={name.trim() === ""}
          >
            Create group
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
