import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FileButton,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'

import { UNGROUPED } from '@/database/index'
import { Icon } from '@/features/icons/IconRenderer'
import { applyMarkdown } from '@/features/markdown/index'
import { createEmptyDocument } from '../model/index'
import { templateList } from '@/features/templates/catalog'
import {
  useLastTemplate,
  useRememberTemplate,
} from '@/features/settings/queries'

import { TemplateTile } from './TemplateTile'
import { useCreateResume, useGroups } from '../queries'

import type { ResumeDocument, TemplateId } from '../model/document'

/**
 * A Markdown file the dialog has read but not yet turned into a resume.
 *
 * The source text is kept rather than the parsed document, because the template
 * is chosen in this same dialog and the document is built from it — so the parse
 * is redone at submit against whatever template is selected by then. Parsing is
 * cheap; a stale `templateId` inside a stored document is not.
 */
interface ImportedMarkdown {
  filename: string
  source: string
  /** Counted, not listed: the file is not open yet, so there is nowhere to point
   * at. The editor shows each one against its line once the resume exists. */
  warningCount: number
  /** The name the file's own `#` heading gave, if it gave one. */
  fullName: string
}

/** Enough for any resume, and small enough that reading it cannot hang the
 * dialog. A Markdown resume is a few kilobytes. */
const MAX_IMPORT_BYTES = 1024 * 1024

const documentFrom = (
  templateId: TemplateId,
  source: string,
): { document: ResumeDocument; warningCount: number; fullName: string } => {
  const { document, warnings } = applyMarkdown(
    createEmptyDocument(templateId),
    source,
  )

  return {
    document,
    warningCount: warnings.length,
    fullName: document.meta.fullName,
  }
}

/** `resume.md` becomes `resume`. A fallback for when the file has no `#`
 * heading to take a name from. */
const withoutExtension = (filename: string): string =>
  filename.replace(/\.[^.]+$/, '')

interface NewResumeDialogProps {
  opened: boolean
  onClose: () => void
  onCreated: (resumeId: string) => void
  /** Preselects a group when opened from inside one. */
  defaultGroupId?: string
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
  const [title, setTitle] = useState('')
  /**
   * The template, as "what the user picked, or what they picked last time".
   *
   * Derived rather than synced from the query in an effect: the remembered value
   * arrives a tick after the dialog mounts, and an effect writing it into state
   * would show `classic` selected for that tick and then move the selection
   * under the pointer.
   */
  const [picked, setPicked] = useState<TemplateId | null>(null)
  const [groupId, setGroupId] = useState(defaultGroupId ?? UNGROUPED)
  const [imported, setImported] = useState<ImportedMarkdown | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const groups = useGroups()
  const createResume = useCreateResume()
  const lastTemplate = useLastTemplate()
  const rememberTemplate = useRememberTemplate()

  const templateId = picked ?? lastTemplate.data ?? 'classic'
  const setTemplateId = setPicked

  const close = () => {
    onClose()
    // Reset after closing so the fields do not visibly clear during the exit
    // transition.
    setTitle('')
    setPicked(null)
    setGroupId(defaultGroupId ?? UNGROUPED)
    setImported(null)
    setImportError(null)
  }

  /**
   * Reads a Markdown file and parses it once, to report what came of it.
   *
   * The file is not the resume yet — nothing is written until the dialog is
   * submitted — so a file that turns out to be empty or unreadable costs
   * nothing but a message.
   */
  const importFile = async (file: File | null) => {
    if (file === null) {
      return
    }

    setImportError(null)

    if (file.size > MAX_IMPORT_BYTES) {
      setImportError(
        `${file.name} is ${Math.round(file.size / 1024)} KB. Markdown resumes are a few kilobytes; this is probably not one.`,
      )
      return
    }

    const source = await file.text()

    if (source.trim() === '') {
      setImportError(`${file.name} is empty.`)
      return
    }

    const parsed = documentFrom(templateId, source)

    setImported({
      filename: file.name,
      source,
      warningCount: parsed.warningCount,
      fullName: parsed.fullName,
    })

    // Only a name the user has not already typed is overwritten.
    setTitle((current) =>
      current.trim() === ''
        ? parsed.fullName === ''
          ? withoutExtension(file.name)
          : parsed.fullName
        : current,
    )
  }

  const submit = async () => {
    const created = await createResume.mutateAsync({
      // An untitled resume is normal — the repository supplies the placeholder
      // rather than this dialog insisting on a name up front.
      ...(title.trim() === '' ? {} : { title: title.trim() }),
      templateId,
      ...(groupId === UNGROUPED ? {} : { groupId }),
      // Parsed here rather than at import, so the template chosen by now is the
      // one the document carries.
      ...(imported === null
        ? {}
        : { document: documentFrom(templateId, imported.source).document }),
    })

    // Remembered after the resume exists, so a failed create does not change
    // what the dialog offers next time.
    rememberTemplate.mutate(templateId)

    close()
    onCreated(created.id)
  }

  return (
    <Modal opened={opened} onClose={close} title="New resume" size={620}>
      <Stack gap="lg">
        <Box>
          <Text
            className="text-muted mb-2 text-[12px] font-medium"
            component="div"
          >
            Template
          </Text>
          <Box className="grid grid-cols-4 gap-2">
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

        <Group grow align="flex-start">
          <TextInput
            label="Name"
            placeholder="Staff Engineer — 2026"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            // Enter submits, since the template is already chosen by then.
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void submit()
              }
            }}
          />
          <Select
            label="Group"
            data={[
              { value: UNGROUPED, label: 'No group' },
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
            icon={<Icon name="markdown-logo" size={16} />}
            variant="light"
            withCloseButton
            onClose={() => setImported(null)}
            title={imported.filename}
          >
            {imported.warningCount === 0
              ? 'Read with nothing left over.'
              : `Read. ${imported.warningCount} ${
                  imported.warningCount === 1 ? 'line' : 'lines'
                } could not be typeset and are kept as source text — the editor points at each one.`}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          {/* Import is an alternative starting point, not a separate flow: the
              template, name and group above still apply to what it produces. */}
          <FileButton
            accept=".md,.markdown,.txt,text/markdown"
            onChange={(file) => void importFile(file)}
          >
            {(props) => (
              <Button
                {...props}
                leftSection={<Icon name="file-arrow-down" size={15} />}
                variant="subtle"
              >
                {imported === null ? 'Import Markdown' : 'Choose another file'}
              </Button>
            )}
          </FileButton>

          <Box className="flex-1" />

          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            loading={createResume.isPending}
          >
            Create resume
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
