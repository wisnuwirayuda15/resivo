import { Spotlight } from '@mantine/spotlight'
import { useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { useNavigate } from '@tanstack/react-router'

import { Icon } from '@/features/icons/IconRenderer'

import type { SpotlightActionGroupData } from '@mantine/spotlight'

/**
 * The command palette — `Ctrl/Cmd+K`.
 *
 * PRD 21 asks for "command actions" and there were none: every destination was
 * reachable only from the sidebar, and two of the app's own commands lived in a
 * menu behind an icon. This is not a second navigation system, it is the
 * keyboard's way into the one that exists.
 *
 * Built on `@mantine/spotlight` rather than by hand. It is first-party, pinned
 * to the same 9.5.1 as the rest of Mantine, so it adds no new vendor and
 * inherits the theme, the modal behaviour and the focus handling already in use
 * — and what it provides is the fiddly part: a filtered, keyboard-driven list
 * with the roving focus and screen-reader semantics that a `div` of buttons
 * takes a long time to get right.
 *
 * The default `tagsToIgnore` is what keeps `mod+K` out of the code panes, whose
 * editable surface is a `textarea` — the same reason the undo shortcut leaves
 * Monaco alone. The paper needs no exclusion: it is a document of its own, and a
 * keydown inside it never reaches this one.
 */

interface CommandPaletteProps {
  onNewResume: () => void
  onNewGroup: () => void
  onShowShortcuts: () => void
  onStartTour: () => void
  onToggleSidebar: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNewResume,
  onNewGroup,
  onShowShortcuts,
  onStartTour,
  onToggleSidebar,
}) => {
  const navigate = useNavigate()
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const isDark = scheme === 'dark'

  const groups: Array<SpotlightActionGroupData> = [
    {
      group: 'Create',
      actions: [
        {
          id: 'new-resume',
          label: 'New resume',
          description: 'Pick a template, or import a Markdown file',
          keywords: 'create add import',
          leftSection: <Icon name="file-plus" size={16} />,
          onClick: onNewResume,
        },
        {
          id: 'new-group',
          label: 'New group',
          description: 'A folder for a set of resumes',
          keywords: 'create add folder',
          leftSection: <Icon name="folder-open" size={16} />,
          onClick: onNewGroup,
        },
      ],
    },
    {
      group: 'Go to',
      actions: [
        {
          id: 'resumes',
          label: 'All resumes',
          keywords: 'library home',
          leftSection: <Icon name="file-text" size={16} />,
          onClick: () => void navigate({ to: '/resumes' }),
        },
        {
          id: 'archive',
          label: 'Archived',
          keywords: 'hidden',
          leftSection: <Icon name="archive" size={16} />,
          onClick: () => void navigate({ to: '/archive' }),
        },
        {
          id: 'templates',
          label: 'Templates',
          description: 'What each layout is for, and how it reads to a parser',
          keywords: 'ats layout design',
          leftSection: <Icon name="squares-four" size={16} />,
          onClick: () => void navigate({ to: '/templates' }),
        },
        {
          id: 'images',
          label: 'Images',
          description: 'Every image on this device, and what nothing uses',
          keywords: 'photo avatar assets unused',
          leftSection: <Icon name="image" size={16} />,
          onClick: () => void navigate({ to: '/images' }),
        },
        {
          id: 'fonts',
          label: 'Fonts',
          description: 'Uploaded typefaces',
          keywords: 'typeface assets woff',
          leftSection: <Icon name="text-aa" size={16} />,
          onClick: () => void navigate({ to: '/fonts' }),
        },
        {
          id: 'settings',
          label: 'Settings',
          description: 'Back up and restore, and what the device is holding',
          keywords: 'backup restore export storage',
          leftSection: <Icon name="gear" size={16} />,
          onClick: () => void navigate({ to: '/settings' }),
        },
        {
          id: 'about',
          label: 'About Resivo',
          keywords: 'help privacy local',
          leftSection: <Icon name="info" size={16} />,
          onClick: () => void navigate({ to: '/about' }),
        },
      ],
    },
    {
      group: 'This app',
      actions: [
        {
          id: 'theme',
          label: isDark ? 'Light theme' : 'Dark theme',
          keywords: 'dark light appearance colour color',
          leftSection: <Icon name={isDark ? 'sun' : 'moon'} size={16} />,
          onClick: () => setColorScheme(isDark ? 'light' : 'dark'),
        },
        {
          id: 'sidebar',
          label: 'Toggle sidebar',
          description: 'Collapse it to a rail of icons, or bring it back',
          keywords: 'navbar rail collapse expand hide narrow',
          leftSection: <Icon name="sidebar-simple" size={16} />,
          onClick: onToggleSidebar,
        },
        {
          id: 'shortcuts',
          label: 'Keyboard shortcuts',
          keywords: 'keys help bindings',
          leftSection: <Icon name="keyboard" size={16} />,
          onClick: onShowShortcuts,
        },
        {
          id: 'tour',
          label: 'Take the tour',
          description: 'A short walk through what is worth knowing',
          keywords: 'onboarding help guide intro',
          leftSection: <Icon name="sparkle" size={16} />,
          onClick: onStartTour,
        },
      ],
    },
  ]

  return (
    <Spotlight
      actions={groups}
      nothingFound="No command matches that."
      radius="dialog"
      scrollable
      searchProps={{
        placeholder: 'Search commands…',
        leftSection: <Icon name="magnifying-glass" size={16} />,
      }}
      shadow="xl"
      // The resume library has its own search box; this searches the app.
      // Highlighting the query is what makes the difference visible while typing.
      highlightQuery
    />
  )
}
