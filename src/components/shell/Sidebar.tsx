import {
  Box,
  AppShell,
  Badge,
  ScrollArea,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { Icon } from '@/features/icons/IconRenderer'
import { GroupRow } from '@/features/resume/components/GroupRow'
import { UNGROUPED } from '@/database/index'
import { useGroupCounts, useGroups } from '@/features/resume/queries'
import { TOUR_TARGET_IDS } from '@/features/onboarding/steps'

import {
  NavButton,
  NavGroup,
  NavItemContent,
  NavLink,
  navItemClassName,
} from './NavItem'
import { Logo } from './Logo'

interface SidebarProps {
  onNewResume: () => void
  onNewGroup: () => void
  /** Called after any navigation, so the mobile overlay can dismiss itself. */
  onNavigate: () => void
  /** The group currently filtered to, from the URL. */
  activeGroupId?: string
  /** True when the library route is showing everything. */
  allActive: boolean
}

/**
 * Contents of the navbar.
 *
 * Split into `AppShell.Section`s so the nav list is the only part that scrolls:
 * the logo stays pinned at the top and settings plus the privacy note stay
 * pinned at the bottom, however long the group list grows.
 *
 * The logo block is 44px to match the header height, which is what makes the
 * sidebar's top edge line up with the application bar under `layout="alt"`.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onNewResume,
  onNewGroup,
  onNavigate,
  activeGroupId,
  allActive,
}) => {
  const groups = useGroups()
  const counts = useGroupCounts()

  const total = Array.from(counts.data?.values() ?? []).reduce(
    (sum, count) => sum + count,
    0,
  )
  const ungroupedCount = counts.data?.get(UNGROUPED)
  const hasGroups = (groups.data?.length ?? 0) > 0

  return (
    <>
      <AppShell.Section className="border-line flex h-toolbar items-center gap-2 border-b px-3">
        <Logo />
        {/* Privacy stated as fact, not as a boast. */}
        <Badge variant="default" size="xs" radius="pill">
          local
        </Badge>
        <Box className="flex-1" />
        <Tooltip label="New resume">
          <UnstyledButton
            onClick={onNewResume}
            aria-label="New resume"
            className="text-muted hover:bg-hover hover:text-body rounded-control duration-fast ease-standard flex h-[26px] w-[26px] items-center justify-center transition-colors"
          >
            <Icon name="plus" size={16} />
          </UnstyledButton>
        </Tooltip>
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} className="py-1.5">
        <NavGroup>
          <NavLink
            icon="squares-four"
            label="All resumes"
            count={total}
            to="/resumes"
            active={allActive}
            onNavigate={onNavigate}
          />
          <NavLink
            icon="archive"
            label="Archived"
            to="/archive"
            onNavigate={onNavigate}
          />
        </NavGroup>

        <NavGroup label="Groups">
          {groups.data?.map((group) => (
            <GroupRow
              active={activeGroupId === group.id}
              count={counts.data?.get(group.id)}
              group={group}
              key={group.id}
              onNavigate={onNavigate}
            />
          ))}

          {/* Only worth showing once at least one group exists — otherwise
              every resume is ungrouped and the row is just a second "all". */}
          {hasGroups && ungroupedCount !== undefined ? (
            <Link
              to="/resumes"
              search={{ group: UNGROUPED }}
              onClick={onNavigate}
              className={navItemClassName(activeGroupId === UNGROUPED)}
              aria-current={activeGroupId === UNGROUPED ? 'page' : undefined}
            >
              <NavItemContent
                icon="folder-open"
                label="Ungrouped"
                count={ungroupedCount}
              />
            </Link>
          ) : null}

          <NavButton icon="plus" label="New group" onClick={onNewGroup} />
        </NavGroup>

        <NavGroup label="Library">
          <NavLink
            icon="sparkle"
            label="Templates"
            to="/templates"
            onNavigate={onNavigate}
          />
          <NavLink
            icon="image"
            label="Images"
            to="/images"
            onNavigate={onNavigate}
            tourId={TOUR_TARGET_IDS.assets}
          />
          <NavLink
            icon="text-aa"
            label="Fonts"
            to="/fonts"
            onNavigate={onNavigate}
          />
        </NavGroup>
      </AppShell.Section>

      <AppShell.Section className="border-line-soft border-t p-1.5">
        <NavGroup>
          <NavLink
            icon="gear"
            label="Settings"
            to="/settings"
            onNavigate={onNavigate}
            tourId={TOUR_TARGET_IDS.settings}
          />
        </NavGroup>
      </AppShell.Section>

      <AppShell.Section className="text-subtle flex items-center gap-1.5 px-3 pt-2 pb-3 text-[11px]">
        <Icon name="lock-simple" size={13} />
        No account. No cloud.
      </AppShell.Section>
    </>
  )
}
