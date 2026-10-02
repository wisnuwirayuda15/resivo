import { Text, Title } from "@mantine/core";

import { cn } from "@/lib/utils";

interface HeadingProps {
  id?: string;
  children?: React.ReactNode;
}

const STYLE: Record<2 | 3 | 4, string> = {
  2: "border-line-soft mt-12 mb-4 border-b pb-2 text-[18px]",
  3: "mt-8 mb-3 text-[15px]",
  4: "mt-6 mb-2 text-[13px]",
};

/**
 * A heading that is its own permalink.
 *
 * The text is the link, so the address is one click from where the reader is
 * looking and no icon needs a label; a `#` fades in beside it on hover as the
 * hint. `scroll-mt` is the height of the sticky header plus a margin, so
 * following the link (or a table-of-contents entry) lands the heading in view
 * and not under the bar.
 */
export const makeHeading = (order: 2 | 3 | 4): React.FC<HeadingProps> => {
  const Heading: React.FC<HeadingProps> = ({ id, children }) => (
    <Title
      className={cn("group text-title scroll-mt-[76px]", STYLE[order])}
      id={id}
      order={order}
    >
      {id === undefined ? (
        children
      ) : (
        <Text
          className="text-inherit no-underline"
          component="a"
          href={`#${id}`}
          inherit
        >
          {children}
          <Text
            aria-hidden
            className="text-subtle duration-fast ease-standard ml-2 opacity-0 transition-opacity group-hover:opacity-100"
            component="span"
            inherit
          >
            #
          </Text>
        </Text>
      )}
    </Title>
  );

  Heading.displayName = `DocsHeading${order}`;

  return Heading;
};
