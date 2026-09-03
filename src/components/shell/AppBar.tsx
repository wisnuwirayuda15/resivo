import {
  Box,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'

import { Link } from '@tanstack/react-router'
import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour'

import { Icon } from '@/features/icons/IconRenderer'
import { TOUR_TARGET_IDS } from '@/features/onboarding/steps'
import { cn } from '@/lib/utils'

import type { ComponentProps, ReactNode } from 'react'

interface AppBarProps {
  title: string
  /** View-specific controls, right-aligned before the shared ones. */
  actions?: ReactNode
  /** Navbar toggle, shown only below the navbar breakpoint. */
  burger?: ReactNode
  /** Opens the shortcuts sheet, which the shell owns so the palette can open
   * the same one. */
  onShowShortcuts: () => void
  /** Starts the onboarding tour again. */
  onStartTour: () => void
}

interface BarButtonProps extends ComponentProps<'button'> {
  icon: string
  label: string
}

/**
 * A toolbar button. Icon-only, so it always carries a label.
 *
 * Forwards its ref and spreads the rest of its props onto the underlying
 * button, because `Menu.Target` and `Tooltip` work by cloning their child and
 * injecting `onClick`, `ref` and the ARIA attributes. A component that swallows
 * those renders fine but never opens anything.
 *
 * `className` has to be pulled out of that spread and merged, not spread over.
 * Tooltip clones its child with `className: cx(ownClassName, childProps.className)`
 * — and this button's classes are inside the component, not on the element
 * Tooltip can see, so what it injects is empty. Spreading it last therefore
 * erased every class here: both header buttons rendered as bare 16px glyphs with
 * no hit area and no hover, which is what made the row look like floating icons.
 */
const BarButton = ({
  icon,
  label,
  className,
  ref,
  ...rest
}: BarButtonProps) => (
  <UnstyledButton
    ref={ref}
    component="button"
    aria-label={label}
    {...rest}
    className={cn(
      'text-muted hover:bg-hover hover:text-body rounded-control duration-fast ease-standard flex h-[30px] w-[30px] items-center justify-center transition-colors',
      className,
    )}
  >
    <Icon name={icon} size={16} />
  </UnstyledButton>
)

/**
 * Contents of the application bar.
 *
 * Fills `AppShell.Header` rather than positioning itself — the shell owns the
 * height (`--spacing-toolbar`), the fixed placement and the bottom border. This
 * is only the row of controls inside it.
 */
export const AppBar: React.FC<AppBarProps> = ({
  title,
  actions,
  burger,
  onShowShortcuts,
  onStartTour,
}) => {
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const isDark = scheme === 'dark'

  return (
    <Box className="flex h-full items-center gap-2 px-4">
      {burger}

      <Text span className="text-title text-[14px] leading-none font-semibold">
        {title}
      </Text>

      <Box className="flex-1" />

      {actions}

      {/* The divider separates the route's own controls from the shared ones,
          and reads as a divider only if it is a clear majority of a control's
          height — 18px against the 30px the design system uses. */}
      <Box className="bg-line mx-1 h-[18px] w-px" />

      {/* The two icon buttons are the same kind of control, so they sit tighter
          to each other than to anything else in the row. The tour points at the
          pair rather than at either button: one of them is a `Menu.Target` and
          the other a `Tooltip` child, and both work by cloning what they wrap. */}
      <OnboardingTour.Target id={TOUR_TARGET_IDS.appMenu}>
        <Box className="flex items-center gap-0.5">
          <Tooltip label={isDark ? 'Light theme' : 'Dark theme'}>
            <BarButton
              icon={isDark ? 'sun' : 'moon'}
              label="Toggle theme"
              onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          </Tooltip>

          <Menu position="bottom-end" shadow="lg" radius="panel" width={220}>
            <Menu.Target>
              <BarButton icon="dots-three" label="Application menu" />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<Icon name="keyboard" size={15} />}
                onClick={onShowShortcuts}
              >
                Keyboard shortcuts
              </Menu.Item>
              <Menu.Item
                component={Link}
                leftSection={<Icon name="info" size={15} />}
                to="/about"
              >
                About Resivo
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<Icon name="sparkle" size={15} />}
                onClick={onStartTour}
              >
                Take the tour
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </OnboardingTour.Target>
    </Box>
  )
}
