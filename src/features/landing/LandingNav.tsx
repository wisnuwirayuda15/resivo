import { Link } from "@tanstack/react-router";
import {
  Box,
  Button,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { Logo } from "@/components/shell/Logo";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * The landing page's own bar.
 *
 * Not `AppBar`. That one carries a burger, a sidebar toggle, a command palette
 * and a route title, none of which exist here, and it is 44px tall because it
 * sits above a working editor. This is 56px, three destinations and one action,
 * on one line at every width.
 *
 * The theme control is the same pair of Mantine hooks the app bar uses, so a
 * choice made here is the choice the editor opens with.
 */

const LINKS = [
  { key: "templates", to: "/templates" },
  { key: "about", to: "/about" },
] as const;

export const LandingNav: React.FC = () => {
  const { t } = useTranslation("landing");
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
      <Box className="mx-auto flex h-[56px] max-w-[1120px] items-center gap-4 px-4 sm:px-8">
        <Link aria-label={t("nav.logo")} to="/">
          <Logo className="h-[16px]" />
        </Link>

        <Box className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Off the bar on a phone, where the logo, the theme control and the
              one action already fill the row. Both are in the footer, and the
              app the button opens has its own navigation. */}
          {LINKS.map((link) => (
            <Text
              className="text-muted hover:text-body duration-fast ease-standard rounded-control hidden px-2 py-1 text-[13px] transition-colors sm:block"
              component={Link}
              key={link.to}
              to={link.to}
            >
              {t(`nav.${link.key}`)}
            </Text>
          ))}

          <UnstyledButton
            aria-label={isDark ? t("nav.lightTheme") : t("nav.darkTheme")}
            className="text-muted hover:text-body hover:bg-hover rounded-control duration-fast ease-standard flex size-[30px] items-center justify-center transition-colors active:scale-[0.96]"
            onClick={() => setColorScheme(isDark ? "light" : "dark")}
          >
            <Icon name={isDark ? "sun" : "moon"} size={15} />
          </UnstyledButton>

          <Button
            className="duration-fast ease-standard ml-1 transition-transform active:scale-[0.98]"
            component={Link}
            to="/resumes"
          >
            {t("nav.openApp")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
