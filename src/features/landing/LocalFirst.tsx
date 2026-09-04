import { Box, Text } from "@mantine/core";

import { Reveal } from "./Reveal";

/**
 * The one section that is an argument rather than a feature.
 *
 * Set as an editorial block, centred and wide-margined, because it is the
 * paragraph the reader most needs to finish. It also states the cost in the
 * same breath as the benefit: a local-first app has a consequence its user has
 * to know about before they lose something, not after.
 */
export const LocalFirst: React.FC = () => (
  <Box className="border-line-soft border-t" component="section">
    <Box className="mx-auto max-w-[760px] px-5 py-24 text-center sm:px-8">
      <Reveal>
        <Text
          className="text-title text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[32px]"
          component="h2"
        >
          No account. No server. No copy anywhere else.
        </Text>
      </Reveal>

      <Reveal order={1}>
        <Text className="text-muted mx-auto mt-6 max-w-[60ch] text-[15px] leading-relaxed">
          A resume is a document about you: where you live, who employs you,
          what you are paid. All of it stays in this browser, on this device.
          There is no backend to breach and no account to delete.
        </Text>
      </Reveal>

      <Reveal order={2}>
        <Text className="text-subtle mx-auto mt-5 max-w-[60ch] text-[13.5px] leading-relaxed">
          That has a price, and it is worth knowing now rather than the first
          time it matters. Clearing this browser&rsquo;s storage deletes your
          resumes. The backup file in Settings is the only thing that survives
          it, and writing one takes a click.
        </Text>
      </Reveal>
    </Box>
  </Box>
);
