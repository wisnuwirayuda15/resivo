import { useState } from 'react'
import { AppShell, Burger } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useNavigate } from '@tanstack/react-router'

import { ClientOnly } from '@/components/client-only'
import { NewGroupDialog } from '@/features/resume/components/NewGroupDialog'
import { NewResumeDialog } from '@/features/resume/components/NewResumeDialog'

import { AppBar } from './AppBar'
import { Sidebar } from './Sidebar'

import type { ReactNode } from 'react'

interface ShellProps {
  title: string
  actions?: ReactNode
  children: ReactNode
  activeGroupId?: string
  /** True when the current view is the unfiltered library. */
  allActive?: boolean
}

/**
 * The application frame, built on Mantine's `AppShell`.
 *
 * `layout="alt"` puts the navbar at full viewport height with the header offset
 * beside it, which is the design system's arrangement: the wordmark sits at the
 * top of the sidebar, and the application bar starts where the sidebar ends.
 *
 * `padding={0}` because each view owns its own padding — the design system uses
 * 24px in content views but none in the editor, which fills the viewport edge to
 * edge. The prop still has to be set explicitly, since `AppShell` uses it to
 * compute section offsets.
 *
 * The sidebar reads group counts from IndexedDB, so it sits inside a
 * `ClientOnly` boundary; the header and content column render on the server.
 */
export const Shell: React.FC<ShellProps> = ({
  title,
  actions,
  children,
  activeGroupId,
  allActive = false,
}) => {
  const navigate = useNavigate()
  const [navOpened, { toggle: toggleNav, close: closeNav }] =
    useDisclosure(false)
  const [newResumeOpen, setNewResumeOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)

  return (
    <AppShell
      layout="alt"
      header={{ height: 44 }}
      navbar={{
        width: 232,
        breakpoint: 'sm',
        // Below the breakpoint the sidebar becomes an overlay, opened by the
        // burger in the header. Desktop keeps it permanently visible.
        collapsed: { mobile: !navOpened },
      }}
      padding={0}
      transitionDuration={200}
      transitionTimingFunction="cubic-bezier(0.2, 0.7, 0.3, 1)"
    >
      <AppShell.Navbar className="bg-surface">
        <ClientOnly>
          <Sidebar
            onNewResume={() => {
              setNewResumeOpen(true)
              closeNav()
            }}
            onNewGroup={() => {
              setNewGroupOpen(true)
              closeNav()
            }}
            // Tapping a destination on mobile should dismiss the overlay.
            onNavigate={closeNav}
            activeGroupId={activeGroupId}
            allActive={allActive}
          />
        </ClientOnly>
      </AppShell.Navbar>

      <AppShell.Header className="bg-surface">
        <AppBar
          title={title}
          actions={actions}
          burger={
            <Burger
              opened={navOpened}
              onClick={toggleNav}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
          }
        />
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>

      <ClientOnly>
        <NewResumeDialog
          opened={newResumeOpen}
          onClose={() => setNewResumeOpen(false)}
          onCreated={(id) =>
            navigate({ to: '/resumes/$resumeId', params: { resumeId: id } })
          }
        />
        <NewGroupDialog
          opened={newGroupOpen}
          onClose={() => setNewGroupOpen(false)}
        />
      </ClientOnly>
    </AppShell>
  )
}
