import { useState } from 'react'
import { Box, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core'

import { DocumentIcon, Icon } from '@/features/icons/IconRenderer'
import { IconPicker } from '@/features/icons/IconPicker'
import { plainText, text } from '@/features/resume/model/index'
import {
  addContact,
  removeContact,
  setContactHref,
  setContactIcon,
  updateContactLabel,
} from '@/features/editor/mutations'
import { cn } from '@/lib/utils'

import { ControlGroup } from './controls'
import { isPlainInline } from './plainInline'

import type { Recipe } from '@/features/editor/mutations'
import type { ContactItem, HeaderBlock } from '@/features/resume/model/document'

/**
 * The header's contact list.
 *
 * It lives here rather than on the paper for one structural reason: the paper's
 * measuring pass is what decides where pages break, and the only editing chrome
 * allowed into that tree is absolutely positioned and contributes no height. An
 * add or delete button sitting inline among the contacts would be in the flow,
 * so switching the editor on would move a page break, the one thing the preview
 * guarantees it never does.
 *
 * The consequence before this existed: `addContact` and `removeContact` had been
 * in the model from the start with no call site, so a contact could be retyped on
 * the paper but never added or removed without editing the Markdown source. A
 * document with no contacts showed no affordance at all, because the renderer
 * draws nothing for an empty list.
 */

interface HeaderPanelProps {
  header: HeaderBlock
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
}

const ContactRow: React.FC<{
  contact: ContactItem
  index: number
  apply: HeaderPanelProps['apply']
}> = ({ contact, index, apply }) => {
  const label = plainText(contact.label)
  const editable = isPlainInline(contact.label)
  const [picking, setPicking] = useState(false)
  const [linking, setLinking] = useState(contact.href !== undefined)

  // Named by position, because a contact has no name of its own and an empty
  // one has no text either, "Delete contact" on four identical rows tells a
  // screen reader nothing about which.
  const named = `contact ${index + 1}`

  return (
    <li className="border-line-soft flex flex-col gap-1 border-b px-2 py-1.5 last:border-b-0">
      <Box className="flex items-center gap-1">
        <Tooltip
          label={contact.icon === undefined ? 'Add icon' : 'Change icon'}
        >
          <UnstyledButton
            aria-label={
              contact.icon === undefined
                ? `Add an icon to ${named}`
                : `Change the icon on ${named}`
            }
            className={cn(
              'rounded-control flex size-[22px] flex-none items-center justify-center',
              contact.icon === undefined
                ? 'border-line text-subtle hover:text-body hover:bg-active border border-dashed'
                : 'text-accent hover:bg-active',
            )}
            onClick={() => setPicking(true)}
          >
            {contact.icon === undefined ? (
              <Icon name="plus" size={10} />
            ) : (
              <DocumentIcon icon={contact.icon} size={13} />
            )}
          </UnstyledButton>
        </Tooltip>

        <Box className="min-w-0 flex-1">
          {editable ? (
            <TextInput
              aria-label={`Label of ${named}`}
              onChange={(event) =>
                apply(
                  updateContactLabel(
                    contact.id,
                    text(event.currentTarget.value),
                  ),
                  { coalesce: `contact:label:${contact.id}` },
                )
              }
              placeholder="you@example.com"
              value={label}
              variant="unstyled"
            />
          ) : (
            <Tooltip
              label="This contact contains formatting. Edit it where the formatting is visible."
              multiline
              w={220}
            >
              <Text span className="text-body block truncate text-[12px]">
                {label}
              </Text>
            </Tooltip>
          )}
        </Box>

        <Tooltip label={contact.href === undefined ? 'Add a link' : 'Link'}>
          <UnstyledButton
            aria-label={`Link for ${named}`}
            aria-pressed={linking}
            className={cn(
              'rounded-control flex size-[22px] flex-none items-center justify-center',
              contact.href === undefined
                ? 'text-subtle hover:text-body hover:bg-active'
                : 'text-accent hover:bg-active',
            )}
            onClick={() => setLinking((current) => !current)}
          >
            <Icon name="link-simple" size={13} />
          </UnstyledButton>
        </Tooltip>

        <Tooltip label="Delete contact">
          <UnstyledButton
            aria-label={`Delete ${named}`}
            className="text-subtle hover:text-danger hover:bg-active rounded-control flex size-[22px] flex-none items-center justify-center"
            onClick={() => apply(removeContact(contact.id))}
          >
            <Icon name="trash" size={13} />
          </UnstyledButton>
        </Tooltip>
      </Box>

      {/* Shown on request rather than always: most contacts are plain text, and
          four rows each carrying an empty URL field would bury the labels. */}
      {linking ? (
        <TextInput
          aria-label={`Link URL for ${named}`}
          leftSection={<Icon name="link-simple" size={12} />}
          onChange={(event) =>
            apply(setContactHref(contact.id, event.currentTarget.value), {
              coalesce: `contact:href:${contact.id}`,
            })
          }
          placeholder="https://example.com"
          value={contact.href ?? ''}
        />
      ) : null}

      <IconPicker
        onChange={(name, weight) =>
          apply(
            setContactIcon(contact.id, {
              library: 'phosphor',
              name,
              ...(weight === 'regular' ? {} : { weight }),
            }),
          )
        }
        onClear={() => apply(setContactIcon(contact.id, undefined))}
        onClose={() => setPicking(false)}
        opened={picking}
        value={contact.icon?.name}
        weight={contact.icon?.weight}
      />
    </li>
  )
}

export const HeaderPanel: React.FC<HeaderPanelProps> = ({ header, apply }) => (
  <ControlGroup title="Contacts">
    {header.contacts.length === 0 ? (
      <Text className="text-muted text-[12px]">
        Email, phone, a link, whatever belongs under your name. They print as
        one line, separated by the template.
      </Text>
    ) : (
      <ul className="border-line-soft rounded-control list-none border">
        {header.contacts.map((contact, index) => (
          <ContactRow
            apply={apply}
            contact={contact}
            index={index}
            key={contact.id}
          />
        ))}
      </ul>
    )}

    <UnstyledButton
      className="border-line text-body hover:bg-hover rounded-control mt-1 flex h-[26px] w-full items-center justify-center gap-1.5 border border-dashed text-[12px]"
      onClick={() => apply(addContact())}
    >
      <Icon name="plus" size={12} />
      Add contact
    </UnstyledButton>
  </ControlGroup>
)
