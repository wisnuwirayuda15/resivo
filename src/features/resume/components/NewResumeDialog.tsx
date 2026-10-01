import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FileButton,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { UNGROUPED } from "@/database/index";
import {
  useErrorText,
  useTranslation,
  useUiLanguage,
} from "@/lib/i18n/useTranslation";
import { Icon } from "@/features/icons/IconRenderer";
import { looksLikeZip } from "@/features/bundle/format";
import { importDocument } from "@/features/interchange/index";
import { createEmptyDocument } from "../model/index";
import { createStartingDocument } from "../sample";
import { templateList } from "@/features/templates/catalog";
import {
  useLastResumeStart,
  useLastTemplate,
  useRememberResumeStart,
  useRememberTemplate,
} from "@/features/settings/queries";

import { TemplateTile } from "./TemplateTile";
import { useCreateResume, useGroups, useImportBundle } from "../queries";

import type { ParsedBundle } from "@/features/bundle/importBundle";
import type { DroppedField, ImportFormat } from "@/features/interchange/index";
import type { ResumeStart } from "../sample";
import type { TemplateId } from "../model/document";

/**
 * A file the dialog has read but not yet turned into a resume.
 *
 * The source text is kept rather than the parsed document, because the template
 * is chosen in this same dialog and the document is built from it, so the parse
 * is redone at submit against whatever template is selected by then. Parsing is
 * cheap; a stale `templateId` inside a stored document is not.
 */
interface ImportedFile {
  filename: string;
  source: string;
  format: ImportFormat | "bundle";
  /** Set for a bundle, which is read whole rather than kept as text: it carries
   * its own template and style, so there is nothing to redo at submit. */
  bundle?: ParsedBundle;
  /** Counted, not listed: the file is not open yet, so there is nowhere to point
   * at. The editor shows each one against its line once the resume exists. */
  warningCount: number;
  /** Fields a JSON Resume file had that a resume here has no place for. */
  dropped: Array<DroppedField>;
  /** The name the file itself gave, if it gave one. */
  fullName: string;
}

/** Enough for any resume, and small enough that reading it cannot hang the
 * dialog. A resume file is a few kilobytes. */
const MAX_IMPORT_BYTES = 1024 * 1024;

/**
 * An imported file as a document, and what came of reading it.
 *
 * Built on the empty document for the chosen template, in English whatever the
 * interface is in: a file is somebody's own writing, and the language it is in
 * is not something the app can read off it. `importDocument` builds with
 * `documentFromMarkdown` and never `applyMarkdown` (see CLAUDE.md), so the
 * empty document supplies the template's design tokens and nothing else.
 */
const documentFrom = (
  templateId: TemplateId,
  filename: string,
  source: string,
) => importDocument(filename, source, createEmptyDocument(templateId));

const FORMAT_ICONS: Record<ImportFormat | "bundle", string> = {
  bundle: "file-zip",
  markdown: "markdown-logo",
  "json-resume": "brackets-curly",
  text: "text-align-left",
};

/** `resume.md` becomes `resume`. A fallback for when the file has no `#`
 * heading to take a name from. */
const withoutExtension = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "");

interface NewResumeDialogProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (resumeId: string) => void;
  /** Preselects a group when opened from inside one. */
  defaultGroupId?: string;
}

/**
 * Creates a resume.
 *
 * Template first, name second: the template decides the whole look, and choosing
 * it is the only decision that is awkward to change later without a prompt about
 * discarding customisations.
 */
export const NewResumeDialog: React.FC<NewResumeDialogProps> = ({
  opened,
  onClose,
  onCreated,
  defaultGroupId,
}) => {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const errorText = useErrorText();
  // A blank page is started in the language the app is in, headings and all.
  const uiLanguage = useUiLanguage();
  const [title, setTitle] = useState("");
  /**
   * The template, as "what the user picked, or what they picked last time".
   *
   * Derived rather than synced from the query in an effect: the remembered value
   * arrives a tick after the dialog mounts, and an effect writing it into state
   * would show `classic` selected for that tick and then move the selection
   * under the pointer.
   */
  const [picked, setPicked] = useState<TemplateId | null>(null);
  /** The starting point, derived from the remembered one for the same reason. */
  const [pickedStart, setPickedStart] = useState<ResumeStart | null>(null);
  const [groupId, setGroupId] = useState(defaultGroupId ?? UNGROUPED);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const groups = useGroups();
  const createResume = useCreateResume();
  const importBundle = useImportBundle();
  const lastTemplate = useLastTemplate();
  const rememberTemplate = useRememberTemplate();
  const lastStart = useLastResumeStart();
  const rememberStart = useRememberResumeStart();

  const templateId = picked ?? lastTemplate.data ?? "classic";
  const setTemplateId = setPicked;

  /**
   * An imported file is itself the starting point, so the choice does not
   * apply while one is loaded rather than silently losing to it.
   */
  const start: ResumeStart = pickedStart ?? lastStart.data ?? "sample";

  const close = () => {
    onClose();
    // Reset after closing so the fields do not visibly clear during the exit
    // transition.
    setTitle("");
    setPicked(null);
    setPickedStart(null);
    setGroupId(defaultGroupId ?? UNGROUPED);
    setImported(null);
    setImportError(null);
  };

  /**
   * Reads a Markdown file and parses it once, to report what came of it.
   *
   * The file is not the resume yet (nothing is written until the dialog is
   * submitted), so a file that turns out to be empty or unreadable costs
   * nothing but a message.
   */
  const readBundle = async (file: File) => {
    try {
      // Loaded here, so the zip library is not part of the library page.
      const { readResumeBundle } =
        await import("@/features/bundle/importBundle");
      const parsed = await readResumeBundle(file);

      setImported({
        filename: file.name,
        source: "",
        format: "bundle",
        bundle: parsed,
        warningCount: 0,
        dropped: [],
        fullName: parsed.document.meta.fullName,
      });
      setTitle((current) => (current.trim() === "" ? parsed.title : current));
    } catch (cause) {
      setImportError(
        errorText(cause, t("create.errors.invalid", { detail: "" })),
      );
    }
  };

  const importFile = async (file: File | null) => {
    if (file === null) {
      return;
    }

    setImportError(null);

    // A zip is a bundle whatever it is called, and it is the one kind of file
    // the size limit below does not apply to: it has limits of its own.
    if (looksLikeZip(new Uint8Array(await file.slice(0, 2).arrayBuffer()))) {
      await readBundle(file);
      return;
    }

    if (file.size > MAX_IMPORT_BYTES) {
      setImportError(
        t("create.tooBig", {
          name: file.name,
          size: Math.round(file.size / 1024),
        }),
      );
      return;
    }

    const source = await file.text();

    if (source.trim() === "") {
      setImportError(t("create.empty", { name: file.name }));
      return;
    }

    let parsed: ReturnType<typeof documentFrom>;

    try {
      parsed = documentFrom(templateId, file.name, source);
    } catch (cause) {
      setImportError(
        errorText(cause, t("create.errors.invalid", { detail: "" })),
      );
      return;
    }

    setImported({
      filename: file.name,
      source,
      format: parsed.format,
      warningCount: parsed.warningCount,
      dropped: parsed.dropped,
      fullName: parsed.fullName,
    });

    // Only a name the user has not already typed is overwritten.
    setTitle((current) =>
      current.trim() === ""
        ? parsed.fullName === ""
          ? withoutExtension(file.name)
          : parsed.fullName
        : current,
    );
  };

  const submit = async () => {
    // A bundle is a resume already, so it is stored as it came rather than built
    // from a template and a start. It remembers neither: the template was not
    // chosen here, and the dialog should offer next time what was chosen last.
    if (imported?.bundle !== undefined) {
      const { resume } = await importBundle.mutateAsync({
        parsed: imported.bundle,
        ...(title.trim() === "" ? {} : { title: title.trim() }),
        ...(groupId === UNGROUPED ? {} : { groupId }),
      });

      close();
      onCreated(resume.id);
      return;
    }

    const created = await createResume.mutateAsync({
      // An untitled resume is normal, the repository supplies the placeholder
      // rather than this dialog insisting on a name up front.
      ...(title.trim() === "" ? {} : { title: title.trim() }),
      templateId,
      ...(groupId === UNGROUPED ? {} : { groupId }),
      /**
       * Built here rather than left to the repository's own default, so what
       * the dialog offered is what gets written and there is one answer to
       * "what does a new resume contain".
       *
       * An imported file is parsed at this point rather than when it was read,
       * so the template chosen by now is the one the document carries.
       */
      document:
        imported === null
          ? createStartingDocument(start, templateId, uiLanguage)
          : documentFrom(templateId, imported.filename, imported.source)
              .document,
    });

    // Remembered after the resume exists, so a failed create does not change
    // what the dialog offers next time. The starting point is only remembered
    // when it was the starting point: an import overrides it, and answering a
    // question the user was not asked would be a guess.
    rememberTemplate.mutate(templateId);

    if (imported === null) {
      rememberStart.mutate(start);
    }

    close();
    onCreated(created.id);
  };

  return (
    <Modal opened={opened} onClose={close} title={t("create.title")} size={620}>
      <Stack gap="lg">
        <Box>
          <Text
            className="text-muted mb-2 text-[12px] font-medium"
            component="div"
          >
            {t("create.template")}
          </Text>
          {/* Two across on a phone. Four tiles in 340px gives each about 80,
              which breaks the description to one word a line and still spills
              the long ones. */}
          <Box className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {templateList.map((template) => (
              <TemplateTile
                key={template.id}
                template={template}
                selected={template.id === templateId}
                onSelect={() => setTemplateId(template.id)}
              />
            ))}
          </Box>
        </Box>

        <Box>
          <Text
            className="text-muted mb-2 text-[12px] font-medium"
            component="div"
          >
            {t("create.startFrom")}
          </Text>

          <SegmentedControl
            data={[
              { value: "sample", label: t("create.example") },
              { value: "blank", label: t("create.blank") },
            ]}
            // An imported file is the starting point, so the choice is shown
            // as inapplicable rather than left looking as though it still
            // decides what the resume contains.
            disabled={imported !== null}
            fullWidth
            onChange={(value) => setPickedStart(value)}
            value={start}
          />

          <Text className="text-muted mt-2 text-[12px] leading-snug">
            {imported !== null
              ? t("create.importedHint")
              : start === "sample"
                ? t("create.exampleHint")
                : t("create.blankHint")}
          </Text>
        </Box>

        <Group grow align="flex-start">
          <TextInput
            label={t("create.name")}
            placeholder={t("create.namePlaceholder")}
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            // Enter submits, since the template is already chosen by then.
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
          />
          <Select
            label={t("create.group")}
            data={[
              { value: UNGROUPED, label: t("create.noGroup") },
              ...(groups.data ?? []).map((group) => ({
                value: group.id,
                label: group.name,
              })),
            ]}
            value={groupId}
            onChange={(value) => setGroupId(value ?? UNGROUPED)}
            allowDeselect={false}
          />
        </Group>

        {importError === null ? null : (
          <Alert color="red" variant="light">
            {importError}
          </Alert>
        )}

        {imported === null ? null : (
          <Alert
            color="blue"
            icon={<Icon name={FORMAT_ICONS[imported.format]} size={16} />}
            variant="light"
            withCloseButton
            onClose={() => setImported(null)}
            title={imported.filename}
          >
            {imported.warningCount === 0
              ? t("create.readClean")
              : t("create.readWarnings", { count: imported.warningCount })}
            {imported.dropped.length === 0
              ? null
              : ` ${t("create.dropped", {
                  fields: imported.dropped
                    .map((field) => t(`create.droppedFields.${field}`))
                    .join(", "),
                })}`}
            {imported.bundle === undefined
              ? null
              : ` ${t("create.bundleHint")}`}
            {imported.bundle?.templateChanged === undefined
              ? null
              : ` ${t("create.templateChanged", imported.bundle.templateChanged)}`}
          </Alert>
        )}

        {imported === null ? (
          <Text className="text-muted -mt-2 text-[12px] leading-snug">
            {t("create.importHint")}
          </Text>
        ) : null}

        <Group justify="flex-end" gap="xs">
          {/* Import is an alternative starting point, not a separate flow: the
              template, name and group above still apply to what it produces. */}
          <FileButton
            accept=".md,.markdown,.txt,.json,.zip,text/markdown,text/plain,application/json,application/zip"
            onChange={(file) => void importFile(file)}
          >
            {(props) => (
              <Button
                {...props}
                leftSection={<Icon name="file-arrow-down" size={15} />}
                variant="subtle"
              >
                {imported === null
                  ? t("create.importFile")
                  : t("create.chooseAnother")}
              </Button>
            )}
          </FileButton>

          {/* The spacer only where the row fits on one line. On a phone it
              would take the whole first row and push the two buttons that
              matter onto a second. */}
          <Box className="hidden flex-1 sm:block" />

          <Button variant="default" onClick={close}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            loading={createResume.isPending || importBundle.isPending}
          >
            {t("create.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
