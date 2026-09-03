import { Link, createFileRoute } from '@tanstack/react-router'
import { Box, Text } from '@mantine/core'

import { Shell } from '@/components/shell/Shell'

/**
 * About.
 *
 * The menu item for this page sat disabled since the chrome was built, and PRD
 * 19 named the route. What it needs to say is not a marketing paragraph: a
 * local-first app has a consequence its user has to know about before they lose
 * something, so the trade-off is the page.
 */
const AboutRoute: React.FC = () => (
  <Shell title="About Resivo">
    <Box className="flex max-w-[68ch] flex-col gap-6 p-6">
      <Box>
        <Text className="text-body text-[15px] font-medium">
          A resume builder that keeps your resume
        </Text>
        <Text className="text-muted mt-1.5 text-[13px] leading-normal">
          A resume is a document about you: where you live, who employs you,
          what you are paid. Resivo keeps all of it in this browser, on this
          device. There is no account, no server, and no request that carries
          your data anywhere.
        </Text>
      </Box>

      <Box>
        <Text className="text-body text-[14px] font-medium">
          What that costs
        </Text>
        <Text className="text-muted mt-1.5 text-[13px] leading-normal">
          Clearing this browser&rsquo;s storage deletes your resumes, and there
          is no copy anywhere else to fall back on. A private window keeps
          nothing after it closes, and another device sees none of this. The
          backup file in{' '}
          <Link className="text-accent hover:underline" to="/settings">
            Settings
          </Link>{' '}
          is the only thing that survives a cleared browser or a lost machine —
          it is worth writing one now rather than the first time it matters.
        </Text>
      </Box>

      <Box>
        <Text className="text-body text-[14px] font-medium">How it works</Text>
        <Text className="text-muted mt-1.5 text-[13px] leading-normal">
          One document, three ways to edit it: Markdown, the paper itself, and
          the style panel. All three write to the same model, which is what
          keeps a single undo history coherent across them. The preview is a
          document of its own rather than a styled box in the app, so what you
          are looking at is what a PDF export prints — page breaks are measured
          from the real thing rather than guessed.
        </Text>
      </Box>

      <Box>
        <Text className="text-body text-[14px] font-medium">
          Exports and imports
        </Text>
        <Text className="text-muted mt-1.5 text-[13px] leading-normal">
          HTML is a single file with no external reference of any kind — images,
          uploaded fonts and the bundled typefaces are all inlined, so it opens
          on a machine that has never seen Resivo. PDF is that same file,
          printed. Markdown round-trips: what the app cannot typeset is kept
          verbatim and reported rather than dropped.
        </Text>
      </Box>

      <Box>
        <Text className="text-body text-[14px] font-medium">
          Templates and ATS
        </Text>
        <Text className="text-muted mt-1.5 text-[13px] leading-normal">
          Every{' '}
          <Link className="text-accent hover:underline" to="/templates">
            template
          </Link>{' '}
          is single-column and parser-safe: no tables holding the layout, no
          text in images, no two-column reading order for a machine to scramble.
          They differ in typeface, spacing, and how much hierarchy comes from
          rules rather than type size.
        </Text>
      </Box>
    </Box>
  </Shell>
)

export const Route = createFileRoute('/about')({ component: AboutRoute })
