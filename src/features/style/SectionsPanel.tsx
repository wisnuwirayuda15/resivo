import { useState } from 'react'
import { Menu, TextInput, Tooltip, UnstyledButton } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SECTION_KINDS } from '@/features/resume/model/document'
import { plainText, text } from '@/features/resume/model/index'
import {
  addSection,
  moveSection,
  removeSection,
  setSectionHidden,
  setSectionTitle,
} from '@/features/editor/mutations'

import type { Recipe } from '@/features/editor/mutations'
import type {
  ResumeContent,
  Section,
  SectionKind,
} from '@/features/resume/model/document'

/**
 * The Sections tab — the document's outline, as an ordered list.
 *
 * Reordering here is by explicit move, not by drag: dnd-kit and the in-preview
 * drag handles arrive with the visual editor, and this list has to be usable from
 * the keyboard regardless of whether that ever lands. When drag does arrive it
 * becomes a second way to do what these buttons already do, not a replacement —
 * both dispatch `moveSection`.
 */

interface SectionsPanelProps {
  content: ResumeContent
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
}

/** Sentence case for the "add section" menu; the model stores kinds lowercase. */
const KIND_LABELS: Record<SectionKind, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards',
  publications: 'Publications',
  languages: 'Languages',
  interests: 'Interests',
  custom: 'Custom section',
}

/**
 * Whether the title is plain enough to edit as a string.
 *
 * A title carrying bold or a link cannot round-trip through a text input without
 * losing its formatting, so this panel shows it read-only and points the user at
 * an editor where the formatting is visible. Silently flattening it would be a
 * data loss the user never asked for.
 */
const isPlainTitle = (title: Section['title']): boolean =>
  title.length === 0 ||
  (title.length === 1 &&
    title[0]?.type === 'text' &&
    (title[0].marks ?? []).length === 0)

const SectionRow: React.FC<{
  section: Section
  index: number
  count: number
  apply: SectionsPanelProps['apply']
  onRequestRemove: () => void
}> = ({ section, index, count, apply, onRequestRemove }) => {
  const label = plainText(section.title)
  const editable = isPlainTitle(section.title)
  const blocks = section.blocks.length

  return (
    <li className="border-line-soft hover:bg-hover flex items-center gap-1 border-b px-2 py-1.5 last:border-b-0">
      <div className="flex flex-none flex-col">
        <Tooltip label="Move up">
          <UnstyledButton
            aria-label={`Move ${label} up`}
            className="text-subtle hover:text-body hover:bg-active disabled:opacity-30 flex h-3.5 w-4 items-center justify-center rounded-[3px]"
            disabled={index === 0}
            onClick={() => apply(moveSection(index, index - 1))}
          >
            <Icon name="caret-up" size={10} />
          </UnstyledButton>
        </Tooltip>
        <Tooltip label="Move down">
          <UnstyledButton
            aria-label={`Move ${label} down`}
            className="text-subtle hover:text-body hover:bg-active disabled:opacity-30 flex h-3.5 w-4 items-center justify-center rounded-[3px]"
            disabled={index === count - 1}
            onClick={() => apply(moveSection(index, index + 1))}
          >
            <Icon name="caret-down" size={10} />
          </UnstyledButton>
        </Tooltip>
      </div>

      <div className="min-w-0 flex-1">
        {editable ? (
          <TextInput
            aria-label={`${label} title`}
            onChange={(event) =>
              apply(
                setSectionTitle(section.id, text(event.currentTarget.value)),
                {
                  coalesce: `section:title:${section.id}`,
                },
              )
            }
            size="xs"
            value={label}
            variant="unstyled"
          />
        ) : (
          <Tooltip
            label="This title contains formatting. Edit it where the formatting is visible."
            multiline
            w={220}
          >
            <span className="text-body block truncate text-[12px]">
              {label}
            </span>
          </Tooltip>
        )}
        <span className="text-subtle font-mono text-[10px] tabular-nums">
          {blocks} {blocks === 1 ? 'block' : 'blocks'}
        </span>
      </div>

      <Tooltip label={section.hidden === true ? 'Show' : 'Hide'}>
        <UnstyledButton
          aria-label={
            section.hidden === true ? `Show ${label}` : `Hide ${label}`
          }
          aria-pressed={section.hidden === true}
          className={[
            'rounded-control flex size-[22px] flex-none items-center justify-center',
            section.hidden === true
              ? 'text-accent bg-selected'
              : 'text-subtle hover:text-body hover:bg-active',
          ].join(' ')}
          onClick={() =>
            apply(setSectionHidden(section.id, section.hidden !== true))
          }
        >
          <Icon
            name={section.hidden === true ? 'eye-slash' : 'eye'}
            size={13}
          />
        </UnstyledButton>
      </Tooltip>

      <Tooltip label="Delete section">
        <UnstyledButton
          aria-label={`Delete ${label}`}
          className="text-subtle hover:text-danger hover:bg-active rounded-control flex size-[22px] flex-none items-center justify-center"
          onClick={onRequestRemove}
        >
          <Icon name="trash" size={13} />
        </UnstyledButton>
      </Tooltip>
    </li>
  )
}

export const SectionsPanel: React.FC<SectionsPanelProps> = ({
  content,
  apply,
}) => {
  const [pendingRemoval, setPendingRemoval] = useState<Section | null>(null)
  const sections = content.sections

  return (
    <div>
      <ul className="list-none">
        {sections.map((section, index) => (
          <SectionRow
            apply={apply}
            count={sections.length}
            index={index}
            key={section.id}
            onRequestRemove={() => setPendingRemoval(section)}
            section={section}
          />
        ))}
      </ul>

      <div className="px-2 py-2">
        <Menu position="bottom-start" width={200} withinPortal>
          <Menu.Target>
            <UnstyledButton className="border-line text-body hover:bg-hover rounded-control flex h-[26px] w-full items-center justify-center gap-1.5 border border-dashed text-[12px]">
              <Icon name="plus" size={12} />
              Add section
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {SECTION_KINDS.map((kind) => (
              <Menu.Item
                key={kind}
                onClick={() => apply(addSection(kind, KIND_LABELS[kind]))}
              >
                {KIND_LABELS[kind]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </div>

      {/* Deleting takes its blocks with it, so it is confirmed rather than
          undo-only — undo is a keystroke away but not obvious mid-edit. Hiding
          is the reversible option, and it is one click on the same row. */}
      <ConfirmDialog
        confirmLabel="Delete section"
        danger
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval !== null) {
            apply(removeSection(pendingRemoval.id))
          }

          setPendingRemoval(null)
        }}
        opened={pendingRemoval !== null}
        title="Delete section"
      >
        <p className="text-body text-[13px]">
          {pendingRemoval === null
            ? null
            : `"${plainText(pendingRemoval.title)}" and its ${pendingRemoval.blocks.length} ${pendingRemoval.blocks.length === 1 ? 'block' : 'blocks'} will be removed. Hide it instead if you only want it off this version.`}
        </p>
      </ConfirmDialog>
    </div>
  )
}
