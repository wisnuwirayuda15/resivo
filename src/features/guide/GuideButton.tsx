import { Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

import { Icon } from '@/features/icons/IconRenderer'

import { GuideDrawer } from './GuideDrawer'

/**
 * The way into the guide, and the drawer it opens.
 *
 * Placed at the end of the code pane's tab strip rather than in the application
 * bar. Two reasons: it is the guide to what is typed in that pane, so it belongs
 * beside it; and the code pane exists in both editor layouts — as a pane on a
 * wide screen and as a tab on a narrow one — so one button covers both without
 * a breakpoint.
 *
 * It carries its word rather than being an icon alone. A guide nobody finds is
 * worth nothing, and "Guide" is two syllables of header space.
 */
export const GuideButton: React.FC = () => {
  const [opened, { open, close }] = useDisclosure(false)

  return (
    <>
      <Button
        leftSection={<Icon name="book-open" size={13} />}
        onClick={open}
        size="compact-xs"
        variant="default"
      >
        Guide
      </Button>

      <GuideDrawer onClose={close} opened={opened} />
    </>
  )
}
