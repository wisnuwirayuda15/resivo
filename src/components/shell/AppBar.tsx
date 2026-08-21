import {
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'

import type { ComponentProps, ReactNode } from 'react'

interface AppBarProps {
  title: string
  /** View-specific controls, right-aligned before the shared ones. */
  actions?: ReactNode
  /** Navbar toggle, shown only below the navbar breakpoint. */
  burger?: ReactNode
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
 */
const BarButton = ({ icon, label, ref, ...rest }: BarButtonProps) => (
  <UnstyledButton
    ref={ref}
    component="button"
    aria-label={label}
    className="text-muted hover:bg-hover hover:text-body rounded-control duration-fast ease-standard flex h-[30px] w-[30px] items-center justify-center transition-colors"
    {...rest}
  >
    <Icon name={icon} size={16} />
  </UnstyledButton>
)

/**
 * Contents of the application bar.
 *
 * Fills `AppShell.Header` rather than positioning itself — the shell owns the
 * 44px height, the fixed placement and the bottom border. This is only the row
 * of controls inside it.
 */
export const AppBar: React.FC<AppBarProps> = ({ title, actions, burger }) => {
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const isDark = scheme === 'dark'

  return (
    <div className="flex h-full items-center gap-2 px-4">
      {burger}

      <Text span className="text-title text-[14px] leading-none font-semibold">
        {title}
      </Text>

      <div className="flex-1" />

      {actions}

      <div className="bg-line mx-1 h-4 w-px" />

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
          <Menu.Item leftSection={<Icon name="keyboard" size={15} />} disabled>
            Keyboard shortcuts
          </Menu.Item>
          <Menu.Item leftSection={<Icon name="info" size={15} />} disabled>
            About Resivo
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}
