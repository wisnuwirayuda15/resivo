import { Spotlight } from "@mantine/spotlight";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation, useUiLanguage } from "@/lib/i18n/useTranslation";

import { Icon } from "@/features/icons/IconRenderer";
import { setLanguage } from "@/lib/i18n";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import type { SpotlightActionGroupData } from "@mantine/spotlight";

/**
 * The command palette, `Ctrl/Cmd+K`.
 *
 * PRD 21 asks for "command actions" and there were none: every destination was
 * reachable only from the sidebar, and two of the app's own commands lived in a
 * menu behind an icon. This is not a second navigation system, it is the
 * keyboard's way into the one that exists.
 *
 * Built on `@mantine/spotlight` rather than by hand. It is first-party, pinned
 * to the same 9.5.1 as the rest of Mantine, so it adds no new vendor and
 * inherits the theme, the modal behaviour and the focus handling already in use,
 * and what it provides is the fiddly part: a filtered, keyboard-driven list
 * with the roving focus and screen-reader semantics that a `div` of buttons
 * takes a long time to get right.
 *
 * The default `tagsToIgnore` is what keeps `mod+K` out of the code panes, whose
 * editable surface is a `textarea`, the same reason the undo shortcut leaves
 * Monaco alone. The paper needs no exclusion: it is a document of its own, and a
 * keydown inside it never reaches this one.
 */

interface CommandPaletteProps {
  onNewResume: () => void;
  onNewGroup: () => void;
  onShowShortcuts: () => void;
  onStartTour: () => void;
  onToggleSidebar: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNewResume,
  onNewGroup,
  onShowShortcuts,
  onStartTour,
  onToggleSidebar,
}) => {
  const { t } = useTranslation("commands");
  const navigate = useNavigate();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = scheme === "dark";
  const language = useUiLanguage();

  const groups: Array<SpotlightActionGroupData> = [
    {
      group: t("groups.create"),
      actions: [
        {
          id: "new-resume",
          label: t("newResume.label"),
          description: t("newResume.description"),
          keywords: t("newResume.keywords"),
          leftSection: <Icon name="file-plus" size={16} />,
          onClick: onNewResume,
        },
        {
          id: "new-group",
          label: t("newGroup.label"),
          description: t("newGroup.description"),
          keywords: t("newGroup.keywords"),
          leftSection: <Icon name="folder-open" size={16} />,
          onClick: onNewGroup,
        },
      ],
    },
    {
      group: t("groups.goTo"),
      actions: [
        {
          id: "resumes",
          label: t("resumes.label"),
          keywords: t("resumes.keywords"),
          leftSection: <Icon name="file-text" size={16} />,
          onClick: () => void navigate({ to: "/resumes" }),
        },
        {
          id: "archive",
          label: t("archive.label"),
          keywords: t("archive.keywords"),
          leftSection: <Icon name="archive" size={16} />,
          onClick: () => void navigate({ to: "/archive" }),
        },
        {
          id: "templates",
          label: t("templates.label"),
          description: t("templates.description"),
          keywords: t("templates.keywords"),
          leftSection: <Icon name="squares-four" size={16} />,
          onClick: () => void navigate({ to: "/templates" }),
        },
        {
          id: "images",
          label: t("images.label"),
          description: t("images.description"),
          keywords: t("images.keywords"),
          leftSection: <Icon name="image" size={16} />,
          onClick: () => void navigate({ to: "/images" }),
        },
        {
          id: "fonts",
          label: t("fonts.label"),
          description: t("fonts.description"),
          keywords: t("fonts.keywords"),
          leftSection: <Icon name="text-aa" size={16} />,
          onClick: () => void navigate({ to: "/fonts" }),
        },
        {
          id: "settings",
          label: t("settings.label"),
          description: t("settings.description"),
          keywords: t("settings.keywords"),
          leftSection: <Icon name="gear" size={16} />,
          onClick: () => void navigate({ to: "/settings" }),
        },
        {
          id: "about",
          label: t("about.label"),
          keywords: t("about.keywords"),
          leftSection: <Icon name="info" size={16} />,
          onClick: () => void navigate({ to: "/about" }),
        },
      ],
    },
    {
      group: t("groups.app"),
      actions: [
        {
          id: "theme",
          label: isDark ? t("theme.light") : t("theme.dark"),
          keywords: t("theme.keywords"),
          leftSection: <Icon name={isDark ? "sun" : "moon"} size={16} />,
          onClick: () => setColorScheme(isDark ? "light" : "dark"),
        },
        {
          id: "sidebar",
          label: t("sidebar.label"),
          description: t("sidebar.description"),
          keywords: t("sidebar.keywords"),
          leftSection: <Icon name="sidebar-simple" size={16} />,
          onClick: onToggleSidebar,
        },
        {
          id: "shortcuts",
          label: t("shortcuts.label"),
          keywords: t("shortcuts.keywords"),
          leftSection: <Icon name="keyboard" size={16} />,
          onClick: onShowShortcuts,
        },
        {
          id: "tour",
          label: t("tour.label"),
          description: t("tour.description"),
          keywords: t("tour.keywords"),
          leftSection: <Icon name="sparkle" size={16} />,
          onClick: onStartTour,
        },
        // One entry for each language other than the current one. The palette
        // offers the change rather than a toggle, because with more than two
        // languages a toggle would have to guess which one was meant.
        ...SUPPORTED_LANGUAGES.filter((option) => option !== language).map(
          (option) => ({
            id: `language-${option}`,
            label: t("language.label", { language: LANGUAGE_NAMES[option] }),
            keywords: t("language.keywords"),
            leftSection: <Icon name="translate" size={16} />,
            onClick: () => void setLanguage(option),
          }),
        ),
      ],
    },
  ];

  return (
    <Spotlight
      actions={groups}
      nothingFound={t("nothingFound")}
      radius="dialog"
      scrollable
      searchProps={{
        placeholder: t("search"),
        leftSection: <Icon name="magnifying-glass" size={16} />,
      }}
      shadow="xl"
      // The resume library has its own search box; this searches the app.
      // Highlighting the query is what makes the difference visible while typing.
      highlightQuery
    />
  );
};
