import { Text } from "@mantine/core";

import { FALLBACK_LANGUAGE } from "@/lib/i18n/language";
import { useRouteLanguage } from "@/lib/i18n/useRouteLanguage";

import { DocsLink } from "../components/DocsLink";
import { localizeInternalHref } from "../paths";

const LINK =
  "text-accent hover:underline underline-offset-2 decoration-from-font";

interface DocLinkProps {
  href?: string;
  children?: React.ReactNode;
}

/**
 * The `a` of every article.
 *
 * A link to another docs page is written without a language and is given the
 * one being read (see `localizeInternalHref`), then routed in-app. An anchor
 * on the same page stays a plain anchor. Anything off the site opens in a new
 * tab, with `noopener` so the destination cannot reach back into this window.
 */
export const DocLink: React.FC<DocLinkProps> = ({ href = "", children }) => {
  const lang = useRouteLanguage() ?? FALLBACK_LANGUAGE;
  const target = localizeInternalHref(href, lang);

  if (target !== href) {
    return (
      <DocsLink className={LINK} href={target}>
        {children}
      </DocsLink>
    );
  }

  const external = /^[a-z][a-z\d+.-]*:/i.test(href);

  return (
    <Text
      className={LINK}
      component="a"
      href={href}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {children}
    </Text>
  );
};
