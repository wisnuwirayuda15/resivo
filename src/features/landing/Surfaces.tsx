import { Box, Text } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'

import { Reveal } from './Reveal'

/**
 * The three editing surfaces.
 *
 * Hairlines and space, no cards. Three boxes side by side is the most tired
 * shape a landing page has, and there is no elevation to communicate here: the
 * three are peers, and what matters is the sentence underneath saying they are
 * the same document.
 */

const SURFACES = [
  {
    icon: 'markdown-logo',
    title: 'Markdown',
    body: 'CommonMark and GFM, plus a few directives for the things a heading convention cannot get back out again.',
  },
  {
    icon: 'cursor-text',
    title: 'The paper',
    body: 'Click any line to change it where it sits, or drag a block to move it. The page you edit is the page that prints.',
  },
  {
    icon: 'palette',
    title: 'The style panel',
    body: 'Every design token: paper size, margins, type, colour, rules, icons, and where the pages break.',
  },
] as const

export const Surfaces: React.FC = () => (
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
          Three ways to edit it. One document underneath.
        </Text>
      </Reveal>

      <Box className="border-line-soft mt-12 grid gap-10 border-t pt-10 sm:grid-cols-3 sm:gap-0 sm:divide-line-soft sm:divide-x">
        {SURFACES.map((surface, index) => (
          <Reveal
            className="sm:px-6 sm:first:pl-0 sm:last:pr-0 md:px-8"
            key={surface.title}
            order={index}
          >
            <Icon className="text-accent" name={surface.icon} size={18} />
            <Text className="text-title mt-3 text-[15px] font-medium">
              {surface.title}
            </Text>
            <Text className="text-muted mt-2 max-w-[34ch] text-[13px] leading-relaxed">
              {surface.body}
            </Text>
          </Reveal>
        ))}
      </Box>

      <Reveal order={3}>
        <Text className="text-subtle mt-10 max-w-[62ch] text-[13px] leading-relaxed">
          A slider, a drag on the page and a keystroke in the Markdown all write
          to the same model, which is why one undo history covers all three.
        </Text>
      </Reveal>
    </Box>
  </Box>
)
