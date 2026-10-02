import { Box, Text } from "@mantine/core";

import { cn } from "@/lib/utils";

export type CalloutType = "note" | "tip" | "warning" | "danger";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children?: React.ReactNode;
}

/**
 * The semantic family each kind borrows, so a callout is correct in both colour
 * schemes with no palette of its own: the app's `info`, `success`, `warning` and
 * `danger` tokens already resolve per scheme. A kind is a colour and nothing
 * else: no icon, because only some icons are bundled eagerly and the rest would
 * arrive late and shift the box.
 */
const TONE: Record<CalloutType, string> = {
  note: "border-info bg-info-quiet",
  tip: "border-success bg-success-quiet",
  warning: "border-warning bg-warning-quiet",
  danger: "border-danger bg-danger-quiet",
};

/**
 * A boxed aside. Title is optional and is the author's own words, which is why
 * it is a prop and not a string here.
 *
 * Children are block content (paragraphs, lists, code), and the first and last
 * child lose their outer margin so the box does not pad itself twice.
 */
export const Callout: React.FC<CalloutProps> = ({
  type = "note",
  title,
  children,
}) => (
  <Box
    className={cn(
      "rounded-panel my-5 border-l-[3px] px-4 py-3 text-[14px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      TONE[type],
    )}
    role="note"
  >
    {title === undefined ? null : (
      <Text className="text-title mb-1 text-[13px] font-medium">{title}</Text>
    )}
    {children}
  </Box>
);
