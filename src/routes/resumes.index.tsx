import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Box, Button, Menu, Select, TextInput } from '@mantine/core'
import { z } from 'zod'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/features/icons/IconRenderer'
import { NewResumeDialog } from '@/features/resume/components/NewResumeDialog'
import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour'
import { TOUR_TARGET_IDS } from '@/features/onboarding/steps'
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

/**
 * The sort options, once.
 *
 * Two controls offer them (a select where the row has room and a menu where it
 * does not), and a list that lived in only one of them would be a list that
 * could differ between widths.
 */
const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'edited', label: 'Last edited' },
  { value: 'created', label: 'Date created' },
  { value: 'title', label: 'Name' },
]

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
          {/* Flexible below `sm`, where 200px of search would leave the title
              nothing. It shrinks rather than disappearing: finding a resume is
              the reason this row exists. */}
          <TextInput
            className="w-[126px] sm:w-[200px]"
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
          {/* The same three options, in the shape each width has room for.

              A 132px select where the row can afford one, and a menu behind a
              24px glyph where it cannot, rather than no sorting at all on a
              phone, which is what hiding it amounted to. Two controls rather
              than one because `visibleFrom` is pure CSS and needs no media
              query in a header the server renders; only one of them is ever
              displayed. */}
          <Select
            visibleFrom="sm"
            w={132}
            aria-label="Sort resumes"
            data={SORT_OPTIONS}
            value={sort}
            onChange={(value) => setSearch({ sort: value ?? 'edited' })}
            allowDeselect={false}
          />

          <Box hiddenFrom="sm">
            <Menu position="bottom-end" radius="panel" shadow="lg" width={180}>
              <Menu.Target>
                <Button
                  aria-label="Sort resumes"
                  className="w-[30px] px-0"
                  variant="default"
                >
                  <Icon name="arrows-down-up" size={15} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Sort by</Menu.Label>
                {SORT_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option.value}
                    leftSection={
                      <Icon
                        name={option.value === sort ? 'check' : 'dot-outline'}
                        size={15}
                      />
                    }
                    onClick={() => setSearch({ sort: option.value })}
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Box>
          {/* The header's button, not the sidebar's or the empty state's: it
              is the one that is on screen whatever the library holds. */}
          <OnboardingTour.Target id={TOUR_TARGET_IDS.newResume}>
            {/* The glyph alone on a phone, and centred in its own square.

                The icon is a child rather than a `leftSection`, because a
                section keeps its trailing margin once the label beside it is
                hidden, which left the plus a few pixels left of centre and
                looking out of line with everything else in the row.
                `aria-label` is what keeps the button named either way. */}
            <Button
              aria-label="New resume"
              className="max-sm:w-[30px] max-sm:px-0"
              onClick={() => setNewResumeOpen(true)}
            >
              <Icon name="plus" size={15} />
              <Box className="ms-1.5 hidden sm:inline" component="span">
                New resume
              </Box>
            </Button>
          </OnboardingTour.Target>
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
