import { Link } from "@tanstack/react-router";
import { Text } from "@mantine/core";

import { isDocsLanguage, parseDocsPath } from "../paths";

import type { ReactNode } from "react";

interface DocsLinkProps {
  /** A docs path such as `/en/docs/format/overview`, or an external address. */
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-current"?: "page";
}

/**
 * A link to a docs page, as the router's own `Link` when it is one.
 *
 * The page tree and the MDX both speak in addresses (`/en/docs/x`), while the
 * router wants a route and params, so this is the one place that translates. An
 * address that is not a docs page (an external link, a language the docs lack)
 * falls through to a plain anchor, which is what it should be.
 */
export const DocsLink: React.FC<DocsLinkProps> = ({
  href,
  children,
  className,
  onClick,
  "aria-current": ariaCurrent,
}) => {
  const parsed = parseDocsPath(href);

  if (parsed === null || !isDocsLanguage(parsed.lang)) {
    return (
      <Text
        aria-current={ariaCurrent}
        className={className}
        component="a"
        href={href}
        onClick={onClick}
      >
        {children}
      </Text>
    );
  }

  return (
    <Link
      // Exact, because the docs home (`/en/docs`) is a prefix of every page and
      // the router would otherwise mark it current on all of them.
      activeOptions={{ exact: true }}
      aria-current={ariaCurrent}
      className={className}
      onClick={onClick}
      params={{ lang: parsed.lang, _splat: parsed.slugs.join("/") }}
      to="/$lang/docs/$"
    >
      {children}
    </Link>
  );
};
