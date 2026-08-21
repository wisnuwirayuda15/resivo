import { useState } from 'react'
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'

import { UNGROUPED } from '@/database/index'
import { templateList } from '@/features/templates/catalog'

import { TemplateTile } from './TemplateTile'
import { useCreateResume, useGroups } from '../queries'

import type { TemplateId } from '../model/document'

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
  const [templateId, setTemplateId] = useState<TemplateId>('classic')
  const [groupId, setGroupId] = useState(defaultGroupId ?? UNGROUPED)

  const groups = useGroups()
  const createResume = useCreateResume()

  const close = () => {
    onClose()
    // Reset after closing so the fields do not visibly clear during the exit
    // transition.
    setTitle('')
    setTemplateId('classic')
    setGroupId(defaultGroupId ?? UNGROUPED)
  }

  const submit = async () => {
    const created = await createResume.mutateAsync({
      // An untitled resume is normal — the repository supplies the placeholder
      // rather than this dialog insisting on a name up front.
      ...(title.trim() === '' ? {} : { title: title.trim() }),
      templateId,
      ...(groupId === UNGROUPED ? {} : { groupId }),
    })

    close()
    onCreated(created.id)
  }

  return (
    <Modal opened={opened} onClose={close} title="New resume" size={620}>
      <Stack gap="lg">
        <div>
          <Text
            className="text-muted mb-2 text-[12px] font-medium"
            component="div"
          >
            Template
          </Text>
          <div className="grid grid-cols-4 gap-2">
            {templateList.map((template) => (
              <TemplateTile
                key={template.id}
                template={template}
                selected={template.id === templateId}
                onSelect={() => setTemplateId(template.id)}
              />
            ))}
          </div>
        </div>

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

        <Group justify="flex-end" gap="xs">
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
