import { createFileRoute } from '@tanstack/react-router'
import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { Moon, Sparkle, Sun } from '@phosphor-icons/react'

const Home: React.FC = () => {
  const { setColorScheme } = useMantineColorScheme()
  const computed = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const isDark = computed === 'dark'

  const toggleScheme = () => setColorScheme(isDark ? 'light' : 'dark')

  return (
    // Tailwind utilities used only for layout/spacing.
    <Container size="sm" className="py-16">
      <Stack gap="lg">
        <Title order={1}>Welcome to Resivo</Title>
        <Text c="dimmed">
          Mantine components themed from a single source of truth, with Tailwind
          utilities reading the same tokens.
        </Text>

        {/*
          Proof of the Tailwind ↔ Mantine token bridge: this panel is styled
          entirely with Tailwind utilities (`rounded-card`, `shadow-card`,
          `bg-app-surface`, `border-app-border`, `text-app-muted`) whose values
          come from the Mantine theme + semantic scheme and flip in dark mode.
        */}
        <div className="rounded-card border border-app-border bg-app-surface p-6 shadow-card">
          <Text size="sm" className="text-app-muted">
            Current color scheme: {computed}
          </Text>

          <Group mt="md">
            <Button leftSection={<Sparkle size={18} weight="fill" />}>
              Primary action
            </Button>
            <Button
              variant="light"
              onClick={toggleScheme}
              leftSection={
                isDark ? <Sun size={18} weight="fill" /> : <Moon size={18} />
              }
            >
              {isDark ? 'Light' : 'Dark'} mode
            </Button>
          </Group>
        </div>
      </Stack>
    </Container>
  )
}

export const Route = createFileRoute('/')({ component: Home })
