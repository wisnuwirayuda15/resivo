import { Box, Button, Text } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { formatBytes } from "../format";

import type { FontSummary } from "@/database/index";
import type { ReactNode } from "react";

interface FontCardProps {
  font: FontSummary;
  unused: boolean;
  onDelete: () => void;
  /** Assignment controls, which only exist where there is a document to assign
   * the face to. The Fonts page has none. */
  actions?: ReactNode;
}

/**
 * One uploaded font.
 *
 * The family name is set in its own face, which is the only preview that tells
 * you anything, and proof the file loaded at all.
 */
export const FontCard: React.FC<FontCardProps> = ({
  font,
  unused,
  onDelete,
  actions,
}) => {
  const { t } = useTranslation("assets");

  return (
    <Box className="border-line-soft rounded-control flex flex-col gap-1 border p-2">
      <Box className="flex items-baseline justify-between gap-2">
        <Text
          className="truncate text-[13px]"
          style={{
            fontFamily: `'${font.family}', var(--font-serif)`,
            fontWeight: font.weight,
            fontStyle: font.style,
          }}
        >
          {font.family}
        </Text>
        <Text
          className="text-subtle flex-none font-mono text-[10px] tabular-nums"
          span
        >
          {font.weight} {font.style === "italic" ? t("card.italic") : ""}{" "}
          {font.format} {formatBytes(font.size)}
        </Text>
      </Box>

      <Box className="flex items-center gap-1">
        {actions}

        <Box className="flex-1" />

        {unused ? (
          <Text className="text-subtle font-mono text-[10px]" span>
            {t("card.unused")}
          </Text>
        ) : null}

        <Button
          color="red"
          onClick={onDelete}
          size="compact-xs"
          variant="subtle"
        >
          {t("card.delete")}
        </Button>
      </Box>
    </Box>
  );
};
