import { Link } from '@tanstack/react-router'
import { Box, Text } from '@mantine/core'
import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour'

import { cn } from '@/lib/utils'
import { Icon } from '@/features/icons/IconRenderer'

import type { ComponentProps, ReactNode } from 'react'

/**
 * Shared appearance for a sidebar row.
 *
 * Exported as a class-name builder plus a content component rather than one
 * closed component, because rows differ in what they *are*: some are plain
 * links, some carry search params (whose types TanStack derives from the target
 * route, so they cannot be funnelled through one loose prop), and some are
 * buttons. This way every variant is fully type-checked and still looks
 * identical.
 *
 * Selection is an accent-tinted fill, never a coloured left border bar.
 */
export const navItemClassName = (active = false): string =>
  cn(
    'flex w-full items-center gap-2.5 rounded-control px-2.5 text-[13px]',
    'h-[26px] transition-colors duration-fast ease-standard',
    active
      ? 'bg-selected text-accent font-medium'
      : 'text-muted hover:bg-hover hover:text-body',
  )

interface NavItemContentProps {
  icon: string
  label: string
  /** Shown right-aligned. A zero is omitted rather than displayed, so an empty
   * group reads as empty instead of as a count of nothing. */
  count?: number
}

export const NavItemContent: React.FC<NavItemContentProps> = ({
  icon,
  label,
  count,
}) => (
  <>
    <Icon name={icon} size={16} />
    <Text className="flex-1 truncate text-left" span>
      {label}
    </Text>
    {count === undefined || count === 0 ? null : (
      <Text className="text-subtle font-mono text-[11px]" span>
        {count}
      </Text>
    )}
  </>
)

type NavLinkProps = NavItemContentProps &
  Pick<ComponentProps<typeof Link>, 'to'> & {
    active?: boolean
    /** Lets the mobile navbar overlay dismiss itself once a row is tapped. */
    onNavigate?: () => void
  }

/**
 * A row that navigates to a route with no search params.
 *
 * `tourId` opts the row in as an onboarding-tour anchor. It is a prop rather
 * than a spread of the rest, because these components deliberately do not
 * forward arbitrary props — a nav row is not a generic element.
 */
export const NavLink: React.FC<NavLinkProps & { tourId?: string }> = ({
  icon,
  label,
  count,
  to,
  active = false,
  onNavigate,
  tourId,
}) => {
  const link = (
    <Link
      to={to}
      onClick={onNavigate}
      className={navItemClassName(active)}
      // Driven by the caller rather than by `activeProps`: several rows share one
      // route and differ only by their search params.
      aria-current={active ? 'page' : undefined}
    >
      <NavItemContent icon={icon} label={label} count={count} />
    </Link>
  )

  return tourId === undefined ? (
    link
  ) : (
    <OnboardingTour.Target id={tourId}>{link}</OnboardingTour.Target>
  )
}

/** A row that performs an action instead of navigating. */
export const NavButton: React.FC<
  NavItemContentProps & { onClick: () => void; active?: boolean }
> = ({ icon, label, count, onClick, active = false }) => (
  <button type="button" onClick={onClick} className={navItemClassName(active)}>
    <NavItemContent icon={icon} label={label} count={count} />
  </button>
)

interface NavGroupProps {
  /** Uppercase micro-label. Omitted for the first, unlabelled group. */
  label?: string
  children: ReactNode
}

export const NavGroup: React.FC<NavGroupProps> = ({ label, children }) => (
  <Box className="px-2.5 pb-1.5">
    {label === undefined ? null : (
      <Text
        className="text-subtle px-2.5 pt-3 pb-1.5 text-[10px] font-medium tracking-[0.06em] uppercase"
        component="div"
      >
        {label}
      </Text>
    )}
    <Box className="flex flex-col gap-px">{children}</Box>
  </Box>
)
