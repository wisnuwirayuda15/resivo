import {
  Box,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";

import { Link } from "@tanstack/react-router";
import { useTranslation, useUiLanguage } from "@/lib/i18n/useTranslation";

import { docsHref } from "@/features/docs/paths";
import { Icon } from "@/features/icons/IconRenderer";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { cn } from "@/lib/utils";

import { EditableTitle } from "./EditableTitle";

import type { ComponentProps, ReactNode } from "react";

interface AppBarProps {
  title: string;
  /** Makes the title a field. Left out where the title is a fixed name. */
  onTitleChange?: (title: string) => void;
  /** View-specific controls, right-aligned before the shared ones. */
  actions?: ReactNode;
  /** Navbar toggle, shown only below the navbar breakpoint. */
  burger?: ReactNode;
  /** Opens the shortcuts sheet, which the shell owns so the palette can open
   * the same one. */
  onShowShortcuts: () => void;
  /** Starts the onboarding tour again. */
  onStartTour: () => void;
  /** Collapses the sidebar to its rail, or brings it back. */
  onToggleSidebar: () => void;
}

interface BarButtonProps extends ComponentProps<"button"> {
  icon: string;
  label: string;
}

/**
 * A toolbar button. Icon-only, so it always carries a label.
 *
 * Forwards its ref and spreads the rest of its props onto the underlying
 * button, because `Menu.Target` and `Tooltip` work by cloning their child and
 * injecting `onClick`, `ref` and the ARIA attributes. A component that swallows
 * those renders fine but never opens anything.
 *
 * `className` has to be pulled out of that spread and merged, not spread over.
 * Tooltip clones its child with `className: cx(ownClassName, childProps.className)`,
 * and this button's classes are inside the component, not on the element
 * Tooltip can see, so what it injects is empty. Spreading it last therefore
 * erased every class here: both header buttons rendered as bare 16px glyphs with
 * no hit area and no hover, which is what made the row look like floating icons.
 */
const BarButton = ({
  icon,
  label,
  className,
  ref,
  ...rest
}: BarButtonProps) => (
  <UnstyledButton
    ref={ref}
    component="button"
    aria-label={label}
    {...rest}
    className={cn(
      "text-muted hover:bg-hover hover:text-body rounded-control duration-fast ease-standard flex h-[30px] w-[30px] items-center justify-center transition-colors",
      className,
    )}
  >
    <Icon name={icon} size={16} />
  </UnstyledButton>
);

/**
 * Contents of the application bar.
 *
 * Fills `AppShell.Header` rather than positioning itself, the shell owns the
 * height (`--spacing-toolbar`), the fixed placement and the bottom border. This
 * is only the row of controls inside it.
 */
export const AppBar: React.FC<AppBarProps> = ({
  title,
  onTitleChange,
  actions,
  burger,
  onShowShortcuts,
  onStartTour,
  onToggleSidebar,
}) => {
  const { t } = useTranslation("shell");
  const lang = useUiLanguage();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = scheme === "dark";

  return (
    <Box className="flex h-full items-center gap-2 px-3 sm:px-4">
      {burger}

      {/* The same slot as the burger, and the two never both appear: below the
          navbar's breakpoint the sidebar is an overlay, which the burger shows
          and hides, and there is no rail to collapse it to. The label does not
          change with the state, a control that renames itself is one the
          server cannot render, and "Toggle" is what the burger says too. */}
      <Box className="flex items-center" visibleFrom="sm">
        <Tooltip label={t("appBar.toggleSidebar")}>
          <BarButton
            icon="sidebar-simple"
            label={t("appBar.toggleSidebar")}
            onClick={onToggleSidebar}
          />
        </Tooltip>
      </Box>

      {/* An `h1`, because it is one: this is the page title, and every route
          behind the shell had no heading at all until it was.

          `truncate` rather than letting it wrap: the bar is one 44px row, and a
          two-line title in it pushes its own baseline off centre. */}
      {onTitleChange === undefined ? (
        <Text
          className="text-title truncate text-[14px] leading-none font-semibold"
          component="h1"
        >
          {title}
        </Text>
      ) : (
        <EditableTitle onChange={onTitleChange} title={title} />
      )}

      <Box className="flex-1" />

      {actions}

      {/* The divider separates the route's own controls from the shared ones,
          and reads as a divider only if it is a clear majority of a control's
          height, 18px against the 30px the design system uses. Gone on a phone,
          where the theme toggle has stepped out and it would be separating the
          menu from nothing. */}
      <Box className="bg-line mx-1 hidden h-[18px] w-px sm:block" />

      {/* The two icon buttons are the same kind of control, so they sit tighter
          to each other than to anything else in the row. The tour points at the
          pair rather than at either button: one of them is a `Menu.Target` and
          the other a `Tooltip` child, and both work by cloning what they wrap, so
          the anchor is the box around them. */}
      <Box
        className="flex items-center gap-0.5"
        data-tour={TOUR_TARGET_IDS.appMenu}
      >
        {/* Out of the row on a phone, where every pixel is contested, and
              into the menu below, so the control still exists at every width. */}
        <Box visibleFrom="sm">
          <Tooltip
            label={isDark ? t("appBar.lightTheme") : t("appBar.darkTheme")}
          >
            <BarButton
              icon={isDark ? "sun" : "moon"}
              label={t("appBar.toggleTheme")}
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
            />
          </Tooltip>
        </Box>

        <Menu position="bottom-end" shadow="lg" radius="panel" width={220}>
          <Menu.Target>
            <BarButton icon="dots-three" label={t("appBar.applicationMenu")} />
          </Menu.Target>
          <Menu.Dropdown>
            {/* Where the theme toggle goes when the row cannot hold it. Only
                  below the breakpoint, so it is never offered twice. */}
            <Menu.Item
              hiddenFrom="sm"
              leftSection={<Icon name={isDark ? "sun" : "moon"} size={15} />}
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
            >
              {isDark ? t("appBar.lightTheme") : t("appBar.darkTheme")}
            </Menu.Item>
            <Menu.Item
              leftSection={<Icon name="keyboard" size={15} />}
              onClick={onShowShortcuts}
            >
              {t("appBar.keyboardShortcuts")}
            </Menu.Item>
            {/* A plain anchor and not the router's link: the docs are a
                  separate site section with their own chrome, so this is a
                  full navigation, and an anchor can be opened in a new tab. */}
            <Menu.Item
              component="a"
              href={docsHref(lang)}
              leftSection={<Icon name="markdown-logo" size={15} />}
            >
              {t("appBar.docs")}
            </Menu.Item>
            <Menu.Item
              component={Link}
              leftSection={<Icon name="info" size={15} />}
              to="/about"
            >
              {t("appBar.about")}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<Icon name="sparkle" size={15} />}
              onClick={onStartTour}
            >
              {t("appBar.takeTheTour")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Box>
  );
};
