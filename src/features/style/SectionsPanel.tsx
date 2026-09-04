import { useState } from 'react'
import {
  Box,
  Menu,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'

import { DocumentIcon, Icon } from '@/features/icons/IconRenderer'
import { IconPicker } from '@/features/icons/IconPicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { SECTION_KINDS } from '@/features/resume/model/document'
import { plainText, text } from '@/features/resume/model/index'
import {
  addSection,
  moveSection,
  removeSection,
  setSectionBreakBefore,
  setSectionHidden,
  setSectionIcon,
  setSectionTitle,
} from '@/features/editor/mutations'

import { HeaderPanel } from './HeaderPanel'
import { isPlainInline } from './plainInline'

import type { Recipe } from '@/features/editor/mutations'
import type {
  ResumeContent,
  Section,
  SectionKind,
} from '@/features/resume/model/document'

/**
 * The Sections tab, the document's outline, with the header above it.
 *
 * Reordering here is by explicit move, not by drag: dnd-kit and the in-preview
 * drag handles arrive with the visual editor, and this list has to be usable from
 * the keyboard regardless of whether that ever lands. When drag does arrive it
 * becomes a second way to do what these buttons already do, not a replacement,
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

const SectionRow: React.FC<{
  section: Section
  index: number
  count: number
  apply: SectionsPanelProps['apply']
  onRequestRemove: () => void
}> = ({ section, index, count, apply, onRequestRemove }) => {
  const label = plainText(section.title)
  const editable = isPlainInline(section.title)
  const blocks = section.blocks.length
  const [picking, setPicking] = useState(false)

  return (
    <li className="border-line-soft hover:bg-hover flex items-center gap-1 border-b px-2 py-1.5 last:border-b-0">
      <Box className="flex flex-none flex-col">
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
      </Box>

      <Box className="min-w-0 flex-1">
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
            <Text span className="text-body block truncate text-[12px]">
              {label}
            </Text>
          </Tooltip>
        )}
        <Text span className="text-subtle font-mono text-[10px] tabular-nums">
          {blocks} {blocks === 1 ? 'block' : 'blocks'}
        </Text>
      </Box>

      {/* The icon is chosen here rather than in the Style tab because it belongs
          to one section, not to the document's style. Empty is the common case,
          so the button shows a dashed placeholder rather than a default glyph
          that would look chosen. */}
      <Tooltip label={section.icon === undefined ? 'Add icon' : 'Change icon'}>
        <UnstyledButton
          aria-label={
            section.icon === undefined
              ? `Add an icon to ${label}`
              : `Change the icon on ${label}`
          }
          className={cn(
            'rounded-control flex size-[22px] flex-none items-center justify-center',
            section.icon === undefined
              ? 'border-line text-subtle hover:text-body hover:bg-active border border-dashed'
              : 'text-accent hover:bg-active',
          )}
          onClick={() => setPicking(true)}
        >
          {section.icon === undefined ? (
            <Icon name="plus" size={10} />
          ) : (
            <DocumentIcon icon={section.icon} size={13} />
          )}
        </UnstyledButton>
      </Tooltip>

      <IconPicker
        onChange={(name, weight) =>
          apply(
            setSectionIcon(section.id, {
              library: 'phosphor',
              name,
              // Only when it is not the default: the document stays free of a
              // field that says nothing, and the Markdown round trip does not
              // grow a `weight` attribute on every icon.
              ...(weight === 'regular' ? {} : { weight }),
            }),
          )
        }
        onClear={() => apply(setSectionIcon(section.id, undefined))}
        onClose={() => setPicking(false)}
        opened={picking}
        value={section.icon?.name}
        weight={section.icon?.weight}
      />

      {/* A forced break belongs to one section, so it is a per-row toggle
          rather than a style token. What the document stores is the override;
          "auto" deletes it rather than writing the word. */}
      <Tooltip
        label={
          section.style?.breakBefore === 'page'
            ? 'Starts on a new page'
            : 'Start on a new page'
        }
      >
        <UnstyledButton
          aria-label={
            section.style?.breakBefore === 'page'
              ? `Stop ${label} starting on a new page`
              : `Start ${label} on a new page`
          }
          aria-pressed={section.style?.breakBefore === 'page'}
          className={cn(
            'rounded-control flex size-[22px] flex-none items-center justify-center',
            section.style?.breakBefore === 'page'
              ? 'text-accent bg-selected'
              : 'text-subtle hover:text-body hover:bg-active',
          )}
          onClick={() =>
            apply(
              setSectionBreakBefore(
                section.id,
                section.style?.breakBefore === 'page' ? 'auto' : 'page',
              ),
            )
          }
        >
          <Icon name="file-plus" size={13} />
        </UnstyledButton>
      </Tooltip>

      <Tooltip label={section.hidden === true ? 'Show' : 'Hide'}>
        <UnstyledButton
          aria-label={
            section.hidden === true ? `Show ${label}` : `Hide ${label}`
          }
          aria-pressed={section.hidden === true}
          className={cn(
            'rounded-control flex size-[22px] flex-none items-center justify-center',
            section.hidden === true
              ? 'text-accent bg-selected'
              : 'text-subtle hover:text-body hover:bg-active',
          )}
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
    <Box>
      {/* The header first, because it is first on the paper. Its contacts are
          edited here for a structural reason, see `HeaderPanel`. */}
      <HeaderPanel apply={apply} header={content.header} />

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

      <Box className="px-2 py-2">
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
      </Box>

      {/* Deleting takes its blocks with it, so it is confirmed rather than
          undo-only, undo is a keystroke away but not obvious mid-edit. Hiding
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
        <Text className="text-body text-[13px]">
          {pendingRemoval === null
            ? null
            : `"${plainText(pendingRemoval.title)}" and its ${pendingRemoval.blocks.length} ${pendingRemoval.blocks.length === 1 ? 'block' : 'blocks'} will be removed. Hide it instead if you only want it off this version.`}
        </Text>
      </ConfirmDialog>
    </Box>
  )
}
