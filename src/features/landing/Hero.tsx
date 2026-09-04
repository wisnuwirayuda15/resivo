import { Link } from '@tanstack/react-router'
import { Box, Button, Text } from '@mantine/core'

import { PaperMiniature } from '@/features/templates/PaperMiniature'

import { Reveal } from './Reveal'
import { SourcePanel } from './SourcePanel'

/**
 * The hero.
 *
 * Split rather than centred, because there are two things to say and one of
 * them is a picture: the left column is the claim, the right column is the
 * claim happening. The panel and the page overlap on purpose, so they read as
 * one object with a before and an after rather than as two screenshots.
 *
 * The stagger is the only motion here, and it is for reading order: headline,
 * then the sentence under it, then the buttons, then the artwork. Each step is
 * 75ms, so the whole entrance is over in under half a second.
 */
export const Hero: React.FC = () => (
  <Box
    className="mx-auto max-w-[1120px] px-5 pt-14 pb-20 sm:px-8 lg:pt-16"
    component="section"
  >
    <Box className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
      <Box className="lg:col-span-5">
        <Reveal>
          <Text
            className="text-title text-[34px] leading-[1.08] font-semibold tracking-[-0.02em] sm:text-[42px]"
            component="h1"
          >
            Your resume never leaves this browser.
          </Text>
        </Reveal>

        <Reveal order={1}>
          <Text className="text-muted mt-5 max-w-[46ch] text-[15px] leading-relaxed">
            Write it in Markdown, style it with real CSS, and export a PDF that
            matches the page exactly.
          </Text>
        </Reveal>

        <Reveal order={2}>
          <Box className="mt-8 flex flex-wrap items-center gap-2.5">
            <Button
              className="duration-fast ease-standard transition-transform active:scale-[0.98]"
              component={Link}
              size="lg"
              to="/resumes"
            >
              Open the app
            </Button>

            <Button
              className="duration-fast ease-standard transition-transform active:scale-[0.98]"
              component={Link}
              size="lg"
              to="/templates"
              variant="default"
            >
              See the templates
            </Button>
          </Box>
        </Reveal>
      </Box>

      {/* The artwork: the source, then the page it makes.

          Beside each other rather than overlapping. An overlap reads as depth
          right up to the moment it covers a word, and the left panel is real
          text somebody might read.

          `aria-hidden` on the page is already set by `PaperMiniature`, and the
          source is read in order, so the composition needs no description of
          its own.

          The three-panel editor needs 1200px, so the hero splits at `lg` and
          not before: below that the artwork gets the full width instead of a
          half column too narrow to hold both halves. */}
      <Reveal className="lg:col-span-7" order={3}>
        <Box className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* `max-w-none` from `sm` up, or the cap meant for a phone would
              keep the panel at 360px while the row around it grew. */}
          <SourcePanel className="w-full max-w-[360px] sm:min-w-0 sm:max-w-none sm:flex-1" />

          <Box className="flex-none sm:mt-10">
            {/* Classic, because it is the one template whose accent is the
                app's own teal. The other three are ink, blue and red, and a
                hero that opens on a red page is announcing the wrong colour. */}
            <PaperMiniature size="hero" templateId="classic" />
          </Box>
        </Box>
      </Reveal>
    </Box>
  </Box>
)
