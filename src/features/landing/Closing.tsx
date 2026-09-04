import { Link } from "@tanstack/react-router";
import { Box, Button, Text } from "@mantine/core";

import { Logo } from "@/components/shell/Logo";

import { Reveal } from "./Reveal";

/**
 * The last ask, and the footer under it.
 *
 * The button says what the one in the bar says. Two labels for one intention is
 * how a page ends up with "Get started" above "Try it free": the reader has to
 * work out whether they are the same door.
 */

const FOOTER_LINKS = [
  { label: "Templates", to: "/templates" },
  { label: "About", to: "/about" },
  { label: "Settings", to: "/settings" },
] as const;

export const Closing: React.FC = () => (
  <>
    <Box className="border-line-soft bg-surface border-t" component="section">
      <Box className="mx-auto max-w-[1120px] px-5 py-20 text-center sm:px-8">
        <Reveal>
          <Text
            className="text-title text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[30px]"
            component="h2"
          >
            Start with a blank page.
          </Text>
          <Text className="text-muted mx-auto mt-4 max-w-[46ch] text-[14px] leading-relaxed">
            Nothing to sign up for. The first resume takes one click and a name.
          </Text>
        </Reveal>

        <Reveal order={1}>
          <Box className="mt-8 flex justify-center">
            <Button
              className="duration-fast ease-standard transition-transform active:scale-[0.98]"
              component={Link}
              size="lg"
              to="/resumes"
            >
              Open the app
            </Button>
          </Box>
        </Reveal>
      </Box>
    </Box>

    <Box className="border-line-soft border-t" component="footer">
      <Box className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
        <Box className="flex items-center gap-3">
          <Logo className="h-[13px]" />
          <Text className="text-subtle text-[12px]" span>
            Everything you write stays on this device.
          </Text>
        </Box>

        <Box className="flex items-center gap-4 sm:ml-auto">
          {FOOTER_LINKS.map((link) => (
            <Text
              className="text-muted hover:text-body duration-fast ease-standard text-[12px] transition-colors"
              component={Link}
              key={link.to}
              to={link.to}
            >
              {link.label}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  </>
);
