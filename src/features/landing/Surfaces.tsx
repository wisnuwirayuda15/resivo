import { Box, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { Reveal } from "./Reveal";

/**
 * The three editing surfaces.
 *
 * Hairlines and space, no cards. Three boxes side by side is the most tired
 * shape a landing page has, and there is no elevation to communicate here: the
 * three are peers, and what matters is the sentence underneath saying they are
 * the same document.
 */

/** The words are in the `landing` messages under `surfaces`, by key. */
const SURFACES = [
  { icon: "markdown-logo", key: "markdown" },
  { icon: "cursor-text", key: "paper" },
  { icon: "palette", key: "style" },
] as const;

export const Surfaces: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <Box
      className="border-line-soft border-t"
      component="section"
      id="how-it-works"
    >
      <Box className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8">
        <Reveal>
          <Text
            className="text-title max-w-[24ch] text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[30px]"
            component="h2"
          >
            {t("surfaces.title")}
          </Text>
        </Reveal>

        <Box className="border-line-soft sm:divide-line-soft mt-12 grid gap-10 border-t pt-10 sm:grid-cols-3 sm:gap-0 sm:divide-x">
          {SURFACES.map((surface, index) => (
            <Reveal
              className="sm:px-6 sm:first:pl-0 sm:last:pr-0 md:px-8"
              key={surface.key}
              order={index}
            >
              <Icon className="text-accent" name={surface.icon} size={18} />
              <Text className="text-title mt-3 text-[15px] font-medium">
                {t(`surfaces.${surface.key}.title`)}
              </Text>
              <Text className="text-muted mt-2 max-w-[34ch] text-[13px] leading-relaxed">
                {t(`surfaces.${surface.key}.body`)}
              </Text>
            </Reveal>
          ))}
        </Box>

        <Reveal order={3}>
          <Text className="text-subtle mt-10 max-w-[62ch] text-[13px] leading-relaxed">
            {t("surfaces.note")}
          </Text>
        </Reveal>
      </Box>
    </Box>
  );
};
