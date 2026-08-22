import { Box, Text, UnstyledButton } from '@mantine/core'

import { PaperMiniature } from '@/features/templates/PaperMiniature'
import { cn } from '@/lib/utils'

import type { TemplateMeta } from '@/features/templates/catalog'

interface TemplateTileProps {
  template: TemplateMeta
  selected: boolean
  onSelect: () => void
}

/**
 * A selectable template, shown as a paper miniature above its name.
 */
export const TemplateTile: React.FC<TemplateTileProps> = ({
  template,
  selected,
  onSelect,
}) => (
  <UnstyledButton
    aria-pressed={selected}
    className={cn(
      'rounded-card duration-fast ease-standard border p-2 text-left transition-colors',
      selected
        ? 'border-line-accent bg-selected'
        : 'border-line-soft bg-surface hover:border-line',
    )}
    onClick={onSelect}
  >
    <Box className="bg-sunken rounded-xs flex justify-center p-2.5">
      <PaperMiniature size="tile" templateId={template.id} />
    </Box>

    <Box className="px-1 pt-2 pb-0.5">
      <Text className="text-title text-[13px] font-medium" component="div">
        {template.name}
      </Text>
      <Text
        className="text-muted mt-0.5 text-[11px] leading-snug"
        component="div"
      >
        {template.description}
      </Text>
    </Box>
  </UnstyledButton>
)
