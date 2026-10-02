import { Children } from "react";
import { Box } from "@mantine/core";

/**
 * A numbered procedure.
 *
 * Written `<Steps><Step>...</Step>...</Steps>`, with a heading or a paragraph
 * leading each step. The numbers come from position and are drawn on a rail, so
 * nothing depends on CSS counters, and the content of a step is free to hold
 * code, lists and callouts.
 */
export const Steps: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <Box
    className="border-line-soft my-6 ml-3 flex list-none flex-col gap-6 border-l pl-8"
    component="ol"
  >
    {Children.toArray(children).map((child, index) => (
      <Box
        className="relative [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        component="li"
        key={index}
      >
        <Box
          aria-hidden
          className="bg-surface border-line text-muted absolute top-0 -left-[45px] flex size-[26px] items-center justify-center rounded-full border text-[12px] font-medium"
        >
          {index + 1}
        </Box>
        {child}
      </Box>
    ))}
  </Box>
);

export const Step: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => <Box>{children}</Box>;
