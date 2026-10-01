import { Box, Text } from "@mantine/core";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { HERO_SOURCE, sourceLineKind } from "./source";

/**
 * The Markdown pane, as it appears on the landing page.
 *
 * Coloured by line rather than by token. The full highlighter is `highlight.js`
 * behind the guide's lazy chunk, and pulling it into the first paint of a
 * marketing page to tint fifteen lines is the wrong trade. Two colours make the
 * only point this panel has to make: the directives are not prose.
 *
 * The text is `source.ts`, which a test parses with the real codec.
 */

const KIND_CLASS = {
  heading: "text-title font-medium",
  directive: "text-accent",
  text: "text-muted",
} as const;

interface SourcePanelProps {
  className?: string;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({ className }) => {
  const { t } = useTranslation("landing");

  return (
    <Box
      className={cn(
        "bg-code border-line-soft rounded-panel overflow-hidden border",
        className,
      )}
    >
      <Box className="border-line-soft bg-surface h-titlebar flex items-center gap-2 border-b px-3">
        <Text className="text-subtle font-mono text-[11px]" span>
          {t("sourcePanel.file")}
        </Text>
      </Box>

      <Box className="p-3">
        {HERO_SOURCE.split("\n").map((line, index) => (
          <Text
            className={cn(
              "font-mono text-[10.5px] leading-[1.7] whitespace-pre-wrap",
              KIND_CLASS[sourceLineKind(line)],
            )}
            component="div"
            key={index}
          >
            {line === "" ? " " : line}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
