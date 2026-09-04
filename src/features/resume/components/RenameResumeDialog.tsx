import { useEffect, useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";

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
      title="Rename resume"
      size={420}
    >
      <Stack gap="lg">
        <TextInput
          label="Name"
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
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={update.isPending}>
            Rename
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
