import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button, Select, TextInput } from '@mantine/core'
import { z } from 'zod'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/features/icons/IconRenderer'
import { NewResumeDialog } from '@/features/resume/components/NewResumeDialog'
import { ResumeLibrary } from '@/features/resume/components/ResumeLibrary'
import { useGroups, useResumes } from '@/features/resume/queries'

import type { SortKey } from '@/features/resume/components/ResumeLibrary'

/**
 * Filter state lives in the URL, not in a store: it makes a filtered view
 * linkable and survives a reload, and the sidebar's group rows are then plain
 * links rather than buttons that mutate hidden state.
 */
const searchSchema = z.object({
  group: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['edited', 'created', 'title']).default('edited'),
})

const LibraryRoute: React.FC = () => {
  const { group, q, sort } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [newResumeOpen, setNewResumeOpen] = useState(false)

  const resumes = useResumes()
  const groups = useGroups()

  const groupName =
    group === undefined
      ? undefined
      : (groups.data?.find((candidate) => candidate.id === group)?.name ??
        'Ungrouped')

  const visible =
    group === undefined
      ? resumes.data
      : resumes.data?.filter((resume) => resume.groupId === group)

  const setSearch = (patch: { q?: string | undefined; sort?: SortKey }) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    })

  return (
    <Shell
      title={groupName ?? 'All resumes'}
      activeGroupId={group}
      allActive={group === undefined}
      actions={
        <>
          <TextInput
            w={200}
            placeholder="Search resumes"
            aria-label="Search resumes"
            leftSection={<Icon name="magnifying-glass" size={15} />}
            value={q ?? ''}
            onChange={(event) =>
              setSearch({
                q:
                  event.currentTarget.value === ''
                    ? undefined
                    : event.currentTarget.value,
              })
            }
          />
          <Select
            w={132}
            aria-label="Sort resumes"
            data={[
              { value: 'edited', label: 'Last edited' },
              { value: 'created', label: 'Date created' },
              { value: 'title', label: 'Name' },
            ]}
            value={sort}
            onChange={(value) => setSearch({ sort: value ?? 'edited' })}
            allowDeselect={false}
          />
          <Button
            leftSection={<Icon name="plus" size={15} />}
            onClick={() => setNewResumeOpen(true)}
          >
            New resume
          </Button>
        </>
      }
    >
      <ClientOnly>
        <ResumeLibrary
          resumes={visible}
          isLoading={resumes.isLoading}
          query={q ?? ''}
          sort={sort}
          emptyState={
            <EmptyState
              icon="file-text"
              title={
                group === undefined
                  ? 'No resumes yet'
                  : `Nothing in ${groupName}`
              }
              body={
                group === undefined
                  ? 'Create a resume to get started. Everything you write stays on this device.'
                  : 'Move a resume into this group, or create one here.'
              }
              action={
                <Button
                  leftSection={<Icon name="plus" size={15} />}
                  onClick={() => setNewResumeOpen(true)}
                >
                  New resume
                </Button>
              }
            />
          }
        />

        <NewResumeDialog
          opened={newResumeOpen}
          onClose={() => setNewResumeOpen(false)}
          {...(group === undefined ? {} : { defaultGroupId: group })}
          onCreated={(resumeId) =>
            navigate({ to: '/resumes/$resumeId', params: { resumeId } })
          }
        />
      </ClientOnly>
    </Shell>
  )
}

export const Route = createFileRoute('/resumes/')({
  validateSearch: searchSchema,
  component: LibraryRoute,
})
