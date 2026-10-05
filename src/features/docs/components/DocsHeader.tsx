import { Link } from "@tanstack/react-router";
import {
  Box,
  Burger,
  Button,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";

import { GithubStars } from "@/components/GithubStars";
import { Logo } from "@/components/shell/Logo";
import { Icon } from "@/features/icons/IconRenderer";

import { docsHref } from "../paths";
import { useDocsTranslation } from "../useDocsTranslation";

import { DocsLink } from "./DocsLink";
import { DocsSearchTrigger } from "./DocsSearch";
import { LanguageMenu } from "./LanguageMenu";

import type { DocsLanguage } from "../paths";

interface DocsHeaderProps {
  lang: DocsLanguage;
  navOpened: boolean;
  onToggleNav: () => void;
}

/**
 * The docs' own bar, 56px like the landing page's and for the same reason: it is
 * a reading surface, not a workspace, so it has none of the app bar's burger,
 * palette or route title.
 *
 * The burger belongs to the sidebar and exists only below `md`, where the
 * sidebar is a drawer. The theme control is the same pair of hooks as the
 * landing nav, so a choice made here is the one the editor opens with.
 */
export const DocsHeader: React.FC<DocsHeaderProps> = ({
  lang,
  navOpened,
  onToggleNav,
}) => {
  const { t } = useDocsTranslation(lang);
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = scheme === "dark";

  return (
    <Box
      className="border-line-soft bg-app/85 sticky top-0 z-10 border-b backdrop-blur-sm"
      component="header"
    >
      <Box className="mx-auto flex h-[56px] max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <Burger
          aria-label={navOpened ? t("header.closeNav") : t("header.openNav")}
          className="md:hidden!"
          onClick={onToggleNav}
          opened={navOpened}
          size="sm"
        />

        <Link aria-label={t("header.logo")} to="/">
          <Logo className="h-[16px]" />
        </Link>

        <DocsLink
          className="text-muted hover:text-body duration-fast ease-standard rounded-control px-2 py-1 text-[13px] transition-colors"
          href={docsHref(lang)}
        >
          {t("header.home")}
        </DocsLink>

        <Box className="ml-auto flex items-center gap-1 sm:gap-2">
          <DocsSearchTrigger lang={lang} />
          <LanguageMenu lang={lang} />

          <UnstyledButton
            aria-label={isDark ? t("header.lightTheme") : t("header.darkTheme")}
            className="text-muted hover:text-body hover:bg-hover rounded-control duration-fast ease-standard flex size-[30px] items-center justify-center transition-colors active:scale-[0.96]"
            onClick={() => setColorScheme(isDark ? "light" : "dark")}
          >
            <Icon name={isDark ? "sun" : "moon"} size={15} />
          </UnstyledButton>

          <Button
            className="duration-fast ease-standard ml-1 hidden transition-transform active:scale-[0.98] sm:inline-flex"
            component={Link}
            to="/resumes"
          >
            {t("header.openApp")}
          </Button>

          <GithubStars label={t("header.github")} locale={lang} />
        </Box>
      </Box>
    </Box>
  );
};
