import { useState } from "react";
import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { useCreateVersion } from "@/features/resume/queries";

import type { ResumeSummary } from "@/database/index";

interface CreateVersionDialogProps {
  /** The resume the version is copied from, or undefined when closed. */
  source: ResumeSummary | undefined;
  /** The title of the resume the family began from, for naming the version. A
   * version of a version is named for the root and not "Master for Acme for
   * Globex". */
  baseTitle: string;
  onClose: () => void;
  onCreated: (resumeId: string) => void;
}

const HTTP_URL = /^https?:\/\//i;

/**
 * Asks which job a version is for, then makes it.
 *
 * The company is the one required answer: it is what the version is called and
 * what the library says under it. The role and the link are for the person's own
 * use, and neither is checked beyond the link being a link, because a posting
 * may say anything and the role is whatever it called itself.
 */
export const CreateVersionDialog: React.FC<CreateVersionDialogProps> = ({
  source,
  baseTitle,
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const createVersion = useCreateVersion();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [attempted, setAttempted] = useState(false);

  const close = () => {
    onClose();
    // After closing, so the fields do not visibly clear during the transition.
    setCompany("");
    setRole("");
    setUrl("");
    setAttempted(false);
  };

  const companyMissing = company.trim() === "";
  const urlInvalid = url.trim() !== "" && !HTTP_URL.test(url.trim());

  const submit = async () => {
    setAttempted(true);

    if (source === undefined || companyMissing || urlInvalid) {
      return;
    }

    const created = await createVersion.mutateAsync({
      sourceId: source.id,
      title: t("version.titleFor", {
        title: baseTitle,
        company: company.trim(),
      }),
      target: {
        company: company.trim(),
        role: role.trim(),
        ...(url.trim() === "" ? {} : { url: url.trim() }),
      },
    });

    if (created === undefined) {
      close();
      return;
    }

    close();
    onCreated(created.id);
  };

  return (
    <Modal
      opened={source !== undefined}
      onClose={close}
      title={t("version.title")}
      size={460}
    >
      <Stack gap="md">
        <Text className="text-muted text-[13px] leading-snug">
          {t("version.intro", { title: source?.title ?? "" })}
        </Text>

        <TextInput
          data-autofocus
          error={
            attempted && companyMissing ? t("version.companyRequired") : null
          }
          label={t("version.company")}
          onChange={(event) => setCompany(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
          value={company}
        />
        <TextInput
          label={t("version.role")}
          onChange={(event) => setRole(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
          value={role}
        />
        <TextInput
          description={t("version.urlHint")}
          error={urlInvalid ? t("version.urlInvalid") : null}
          label={t("version.url")}
          onChange={(event) => setUrl(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
          placeholder="https://"
          value={url}
        />

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={close}>
            {tc("cancel")}
          </Button>
          <Button
            loading={createVersion.isPending}
            onClick={() => void submit()}
          >
            {t("version.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
