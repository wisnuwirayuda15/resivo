import { Box, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { PaperMiniature } from "@/features/templates/PaperMiniature";
import { cn } from "@/lib/utils";

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

/** A real stylesheet, from the guide's own styling chapter. */
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

export const Capabilities: React.FC = () => (
  <Box className="border-line-soft border-t" component="section">
    <Box className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8">
      <Reveal>
        <Text
          className="text-title max-w-[26ch] text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[30px]"
          component="h2"
        >
          What the app does when you are not looking.
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
                Page breaks are measured, not guessed
              </Text>
              <Text className="text-muted mt-2 max-w-[42ch] text-[13px] leading-relaxed">
                Every block is laid out once at the real page width, measured,
                then placed. An entry never breaks mid-entry, and the export
                reuses the breaks the preview already found rather than working
                them out again.
              </Text>
            </Box>

            <Box className="bg-sunken flex flex-none justify-center rounded-xs p-4">
              <PaperMiniature size="card" templateId="classic" />
            </Box>
          </Box>
        </Reveal>

        <Reveal className={cn(CELL, "bg-surface md:col-span-2")} order={1}>
          <Text className="text-title text-[15px] font-medium">
            Markdown that comes back out
          </Text>
          <Text className="text-muted mt-2 text-[13px] leading-relaxed">
            Raw HTML, footnotes and link definitions are kept verbatim and
            reported, never dropped in silence.
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
            1512 icons, six weights
          </Text>
          <Text className="text-muted mt-2 text-[13px] leading-relaxed">
            Searchable, and inlined as real SVG so they survive an export.
          </Text>
          <Box className="text-accent mt-5 flex flex-wrap gap-3">
            {GLYPHS.map((glyph) => (
              <Icon key={glyph} name={glyph} size={18} />
            ))}
          </Box>
        </Reveal>

        <Reveal className={cn(CELL, "bg-surface md:col-span-2")} order={3}>
          <Text className="text-title text-[15px] font-medium">
            Images and fonts, shared
          </Text>
          <Text className="text-muted mt-2 text-[13px] leading-relaxed">
            Uploaded once and available to every resume on this device. Both
            pages also show what nothing refers to any more.
          </Text>
        </Reveal>

        <Reveal className={cn(CELL, "bg-surface md:col-span-2")} order={4}>
          <Text className="text-title text-[15px] font-medium">
            Everything from the keyboard
          </Text>
          <Text className="text-muted mt-2 text-[13px] leading-relaxed">
            A command palette over every page and command, with the shortcuts
            listed where you can find them.
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
                Your own stylesheet, scoped to the paper
              </Text>
              <Text className="text-muted mt-2 max-w-[62ch] text-[13px] leading-relaxed">
                Sanitized on the way in, with no imports and no external
                requests, and injected into a cascade layer above the template.
                It can restyle the page and it cannot reach the app around it or
                break the pagination it was measured against.
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
