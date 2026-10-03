import { Box, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { PaperMiniature } from "@/features/templates/PaperMiniature";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { Reveal } from "./Reveal";

/**
 * The rest of what is in the app.
 *
 * A grid of uneven cells rather than a row of equal ones, so the two things
 * worth looking at get the room and the rest stay short. Three of the six carry
 * something to look at: a page, a row of real icons, and a real stylesheet.
 *
 * The stagger is capped at 300ms by `Reveal`, which is what keeps the sixth
 * cell from arriving after the reader has already read it.
 */

/** A real stylesheet, of the kind the docs describe under custom CSS. */
const CSS_SAMPLE = [
  ".rp-section-title {",
  "  text-transform: uppercase;",
  "  letter-spacing: 0.08em;",
  "}",
];

/** Real glyph names, drawn from the catalog the app ships. */
const GLYPHS = [
  "envelope",
  "map-pin",
  "github-logo",
  "globe",
  "phone",
  "graduation-cap",
  "briefcase",
  "certificate",
];

const CELL = "rounded-panel border-line-soft border p-6";

export const Capabilities: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <Box className="border-line-soft border-t" component="section">
      <Box className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8">
        <Reveal>
          <Text
            className="text-title max-w-[26ch] text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[30px]"
            component="h2"
          >
            {t("capabilities.title")}
          </Text>
        </Reveal>

        {/* Two even columns at tablet width, and the uneven six-column
          arrangement only where a two-column cell is still wide enough to hold
          a sentence. */}
        <Box className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-6">
          <Reveal className={cn(CELL, "bg-surface md:col-span-4")}>
            <Box className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
              <Box className="min-w-0 flex-1">
                <Text className="text-title text-[15px] font-medium">
                  {t("capabilities.breaks.title")}
                </Text>
                <Text className="text-muted mt-2 max-w-[42ch] text-[13px] leading-relaxed">
                  {t("capabilities.breaks.body")}
                </Text>
              </Box>

              <Box className="bg-sunken flex flex-none justify-center rounded-xs p-4">
                <PaperMiniature size="card" templateId="classic" />
              </Box>
            </Box>
          </Reveal>

          <Reveal className={cn(CELL, "bg-surface md:col-span-2")} order={1}>
            <Text className="text-title text-[15px] font-medium">
              {t("capabilities.markdown.title")}
            </Text>
            <Text className="text-muted mt-2 text-[13px] leading-relaxed">
              {t("capabilities.markdown.body")}
            </Text>
          </Reveal>

          {/* One of the three cells with something to look at, and the only one
            with a tinted ground: real glyphs from the catalog, at the size they
            render on the page. */}
          <Reveal
            className={cn(
              CELL,
              "bg-accent-quiet border-line-accent md:col-span-2",
            )}
            order={2}
          >
            <Text className="text-title text-[15px] font-medium">
              {t("capabilities.icons.title")}
            </Text>
            <Text className="text-muted mt-2 text-[13px] leading-relaxed">
              {t("capabilities.icons.body")}
            </Text>
            <Box className="text-accent mt-5 flex flex-wrap gap-3">
              {GLYPHS.map((glyph) => (
                <Icon key={glyph} name={glyph} size={18} />
              ))}
            </Box>
          </Reveal>

          <Reveal className={cn(CELL, "bg-surface md:col-span-2")} order={3}>
            <Text className="text-title text-[15px] font-medium">
              {t("capabilities.assets.title")}
            </Text>
            <Text className="text-muted mt-2 text-[13px] leading-relaxed">
              {t("capabilities.assets.body")}
            </Text>
          </Reveal>

          <Reveal className={cn(CELL, "bg-surface md:col-span-2")} order={4}>
            <Text className="text-title text-[15px] font-medium">
              {t("capabilities.keyboard.title")}
            </Text>
            <Text className="text-muted mt-2 text-[13px] leading-relaxed">
              {t("capabilities.keyboard.body")}
            </Text>
            <Box className="mt-5 flex items-center gap-1.5">
              {["Ctrl", "K"].map((key) => (
                <Text
                  className="border-line-soft bg-raised text-subtle rounded-xs border px-1.5 py-0.5 font-mono text-[11px]"
                  key={key}
                  span
                >
                  {key}
                </Text>
              ))}
            </Box>
          </Reveal>

          <Reveal className={cn(CELL, "bg-surface md:col-span-6")} order={4}>
            <Box className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
              <Box className="min-w-0 flex-1">
                <Text className="text-title text-[15px] font-medium">
                  {t("capabilities.css.title")}
                </Text>
                <Text className="text-muted mt-2 max-w-[62ch] text-[13px] leading-relaxed">
                  {t("capabilities.css.body")}
                </Text>
              </Box>

              <Box className="bg-code border-line-soft rounded-panel flex-none border p-4">
                {CSS_SAMPLE.map((line) => (
                  <Text
                    className="text-muted font-mono text-[11px] leading-[1.7] whitespace-pre"
                    component="div"
                    key={line}
                  >
                    {line}
                  </Text>
                ))}
              </Box>
            </Box>
          </Reveal>
        </Box>
      </Box>
    </Box>
  );
};
