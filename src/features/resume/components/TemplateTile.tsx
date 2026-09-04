import { Box, Text, UnstyledButton } from "@mantine/core";

import { PaperMiniature } from "@/features/templates/PaperMiniature";
import { cn } from "@/lib/utils";

import type { TemplateMeta } from "@/features/templates/catalog";

interface TemplateTileProps {
  template: TemplateMeta;
  selected?: boolean;
  /** Omitted where the tile only describes a template rather than applying it,
   * as on the Templates gallery. Without it the tile is not a control: a button
   * that looks pressable and does nothing is worse than a panel that does not
   * offer the action. */
  onSelect?: () => void;
}

/**
 * A template, shown as a paper miniature above its name.
 *
 * Selectable when it is given something to select, and inert otherwise.
 */
export const TemplateTile: React.FC<TemplateTileProps> = ({
  template,
  selected = false,
  onSelect,
}) => {
  const className = cn(
    "rounded-card duration-fast ease-standard border p-2 text-left transition-colors",
    selected
      ? "border-line-accent bg-selected"
      : onSelect === undefined
        ? "border-line-soft bg-surface"
        : "border-line-soft bg-surface hover:border-line",
  );

  const body = (
    <>
      <Box className="bg-sunken flex justify-center rounded-xs p-2.5">
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
    </>
  );

  if (onSelect === undefined) {
    return <Box className={className}>{body}</Box>;
  }

  return (
    <UnstyledButton
      aria-pressed={selected}
      className={className}
      onClick={onSelect}
    >
      {body}
    </UnstyledButton>
  );
};
