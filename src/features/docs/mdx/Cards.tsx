import { Box, Text } from "@mantine/core";

import { FALLBACK_LANGUAGE } from "@/lib/i18n/language";
import { useRouteLanguage } from "@/lib/i18n/useRouteLanguage";

import { DocsLink } from "../components/DocsLink";
import { localizeInternalHref } from "../paths";

interface CardProps {
  title: string;
  /** A docs path without a language, as in any link. */
  href: string;
  children?: React.ReactNode;
}

/**
 * A grid of links with a line of description each: the docs home, and the top
 * of each section.
 */
export const Cards: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => <Box className="my-6 grid gap-3 sm:grid-cols-2">{children}</Box>;

export const Card: React.FC<CardProps> = ({ title, href, children }) => {
  const lang = useRouteLanguage() ?? FALLBACK_LANGUAGE;

  return (
    <DocsLink
      className="border-line-soft hover:border-line-strong hover:bg-hover rounded-panel duration-fast ease-standard flex flex-col gap-1 border p-4 transition-colors"
      href={localizeInternalHref(href, lang)}
    >
      <Text className="text-title text-[14px] font-medium" component="span">
        {title}
      </Text>
      <Text
        className="text-muted text-[13px] leading-normal [&>p]:m-0"
        component="span"
      >
        {children}
      </Text>
    </DocsLink>
  );
};
