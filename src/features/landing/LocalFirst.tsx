import { Box, Text } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { Reveal } from "./Reveal";

/**
 * The one section that is an argument rather than a feature.
 *
 * Set as an editorial block, centred and wide-margined, because it is the
 * paragraph the reader most needs to finish. It also states the cost in the
 * same breath as the benefit: a local-first app has a consequence its user has
 * to know about before they lose something, not after.
 */
export const LocalFirst: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <Box className="border-line-soft border-t" component="section">
      <Box className="mx-auto max-w-[760px] px-5 py-24 text-center sm:px-8">
        <Reveal>
          <Text
            className="text-title text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[32px]"
            component="h2"
          >
            {t("localFirst.title")}
          </Text>
        </Reveal>

        <Reveal order={1}>
          <Text className="text-muted mx-auto mt-6 max-w-[60ch] text-[15px] leading-relaxed">
            {t("localFirst.body")}
          </Text>
        </Reveal>

        <Reveal order={2}>
          <Text className="text-subtle mx-auto mt-5 max-w-[60ch] text-[13.5px] leading-relaxed">
            {t("localFirst.price")}
          </Text>
        </Reveal>
      </Box>
    </Box>
  );
};
