import { Box, Text } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  /** One or two sentences saying what to do next — never just "nothing here". */
  body: string
  action?: ReactNode
}

/**
 * The shared empty state.
 *
 * A 44px dashed glyph frame rather than an illustration: the design system has
 * no artwork, and inventing some would be the wrong kind of decoration in a tool
 * whose only interesting content is the user's document.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  body,
  action,
}) => (
  <Box className="flex flex-col items-center justify-center px-6 py-20 text-center">
    <Box className="border-line-strong text-subtle flex h-11 w-11 items-center justify-center rounded-md border border-dashed">
      <Icon name={icon} size={20} />
    </Box>
    <Text className="text-title mt-4 text-[14px] font-semibold" component="div">
      {title}
    </Text>
    <Text className="text-muted mt-1.5 max-w-[46ch] text-[13px] leading-normal">
      {body}
    </Text>
    {action === undefined ? null : <Box className="mt-4">{action}</Box>}
  </Box>
)
