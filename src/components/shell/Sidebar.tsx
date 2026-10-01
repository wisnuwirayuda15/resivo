import { ActionIcon, AppShell, Box, ScrollArea, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { UNGROUPED } from "@/database/index";
import { Icon } from "@/features/icons/IconRenderer";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { GroupRow } from "@/features/resume/components/GroupRow";
import { useGroupCounts, useGroups } from "@/features/resume/queries";
import { cn } from "@/lib/utils";

import { Logo, LogoMark } from "./Logo";
import {
  NavButton,
  NavGroup,
  NavItemContent,
  NavLink,
  navItemClassName,
} from "./NavItem";

interface SidebarProps {
  onNewResume: () => void;
  onNewGroup: () => void;
  /** Called after any navigation, so the mobile overlay can dismiss itself. */
  onNavigate: () => void;
  /** The group currently filtered to, from the URL. */
  activeGroupId?: string;
  /** True when the library route is showing everything. */
  allActive: boolean;
  /** Asked for the rail. Honoured only where the sidebar is permanent. */
  collapsed: boolean;
}

/**
 * Where the sidebar is a sidebar rather than an overlay.
 *
 * Mantine's `sm`, written out because it has to agree with `AppShell`'s
 * `navbar.breakpoint` in `Shell.tsx`. Below this width the navbar is opened by
 * the burger and closed by a tap, and a third state between those two is not a
 * state anyone asked for.
 *
 * The width takes care of itself, `AppShell` sets the navbar to 100% below its
 * own breakpoint regardless of `--sidebar-width`. This decides the part React
 * owns: whether the rows are icons or icons with labels.
 */
const PERMANENT = "(min-width: 48em)";

/**
 * Contents of the navbar.
 *
 * Split into `AppShell.Section`s so the nav list is the only part that scrolls:
 * the logo stays pinned at the top and settings plus the privacy note stay
 * pinned at the bottom, however long the group list grows.
 *
 * The logo block is 44px to match the header height, which is what makes the
 * sidebar's top edge line up with the application bar under `layout="alt"`.
 *
 * Collapsed, it is a 60px rail of icons, and two sections are deliberately not
 * in it:
 *
 *  - **The groups.** Every group is the same folder glyph, so a rail would show
 *    a column of identical icons and ask the user to hover each one to find out
 *    which is which. That is a worse list than the one they collapsed.
 *  - **New group.** It follows the groups, and it is in the command palette.
 *
 * What does move rather than disappear is "New resume": it is the one action a
 * new user needs, so on the rail it leaves the header (where there is no room
 * beside the mark), and becomes the first row of the list.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onNewResume,
  onNewGroup,
  onNavigate,
  activeGroupId,
  allActive,
  collapsed,
}) => {
  const { t } = useTranslation("shell");
  const groups = useGroups();
  const counts = useGroupCounts();
  const { pathname } = useLocation();

  /**
   * Read during the first render, not in an effect. This only ever mounts inside
   * a client-only boundary, so `matchMedia` is there, and deciding a frame later
   * would draw the rail's icons inside a 232px overlay and then swap them.
   */
  const permanent = useMediaQuery(PERMANENT, true, {
    getInitialValueInEffect: false,
  });
  const rail = collapsed && permanent;

  const total = Array.from(counts.data?.values() ?? []).reduce(
    (sum, count) => sum + count,
    0,
  );
  const ungroupedCount = counts.data?.get(UNGROUPED);
  const hasGroups = (groups.data?.length ?? 0) > 0;

  return (
    <>
      <AppShell.Section
        className={cn(
          "border-line h-toolbar flex items-center border-b",
          rail ? "justify-center px-0" : "gap-2 px-3",
        )}
      >
        {rail ? (
          <Link to="/">
            <LogoMark />
          </Link>
        ) : (
          <>
            <Link to="/">
              <Logo />
            </Link>
            <Box className="flex-1" />
            <Tooltip label={t("sidebar.newResume")}>
              <ActionIcon
                onClick={onNewResume}
                aria-label={t("sidebar.newResume")}
                className="hover:bg-hover hover:text-body my-1"
              >
                <Icon name="plus" size={16} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} className="py-1.5">
        <NavGroup collapsed={rail}>
          {rail ? (
            <NavButton
              collapsed
              icon="plus"
              label={t("sidebar.newResume")}
              onClick={onNewResume}
            />
          ) : null}
          <NavLink
            collapsed={rail}
            icon="squares-four"
            label={t("sidebar.allResumes")}
            count={total}
            to="/resumes"
            active={allActive}
            onNavigate={onNavigate}
          />
          <NavLink
            collapsed={rail}
            icon="archive"
            label={t("sidebar.archived")}
            to="/archive"
            active={pathname === "/archive"}
            onNavigate={onNavigate}
          />
        </NavGroup>

        {rail ? null : (
          <NavGroup label={t("sidebar.groups")}>
            {groups.data?.map((group) => (
              <GroupRow
                active={activeGroupId === group.id}
                count={counts.data?.get(group.id)}
                group={group}
                key={group.id}
                onNavigate={onNavigate}
              />
            ))}

            {/* Only worth showing once at least one group exists, otherwise
                every resume is ungrouped and the row is just a second "all". */}
            {hasGroups && ungroupedCount !== undefined ? (
              <Link
                to="/resumes"
                search={{ group: UNGROUPED }}
                onClick={onNavigate}
                className={navItemClassName(activeGroupId === UNGROUPED)}
                aria-current={activeGroupId === UNGROUPED ? "page" : undefined}
              >
                <NavItemContent
                  icon="folder-open"
                  label={t("sidebar.ungrouped")}
                  count={ungroupedCount}
                />
              </Link>
            ) : null}

            <NavButton
              icon="plus"
              label={t("sidebar.newGroup")}
              onClick={onNewGroup}
            />
          </NavGroup>
        )}

        <NavGroup collapsed={rail} label={t("sidebar.library")}>
          <NavLink
            collapsed={rail}
            icon="sparkle"
            label={t("sidebar.templates")}
            to="/templates"
            active={pathname === "/templates"}
            onNavigate={onNavigate}
          />
          <NavLink
            collapsed={rail}
            icon="image"
            label={t("sidebar.images")}
            to="/images"
            active={pathname === "/images"}
            onNavigate={onNavigate}
            tourId={TOUR_TARGET_IDS.assets}
          />
          <NavLink
            collapsed={rail}
            icon="text-aa"
            label={t("sidebar.fonts")}
            to="/fonts"
            active={pathname === "/fonts"}
            onNavigate={onNavigate}
          />
        </NavGroup>
      </AppShell.Section>

      <AppShell.Section
        className={cn("border-line-soft border-t", rail ? "p-1" : "p-1.5")}
      >
        <NavGroup collapsed={rail}>
          <NavLink
            collapsed={rail}
            icon="gear"
            label={t("sidebar.settings")}
            to="/settings"
            onNavigate={onNavigate}
            tourId={TOUR_TARGET_IDS.settings}
          />
        </NavGroup>
      </AppShell.Section>

      {/* The rail keeps the padlock and drops the sentence, because the sentence
          is the kind of thing a tooltip can hold. */}
      {rail ? (
        <AppShell.Section className="flex justify-center px-0 pt-2 pb-3">
          <Tooltip label={t("sidebar.privacy")} offset={10} position="right">
            <Box className="text-subtle flex items-center">
              <Icon name="lock-simple" size={13} />
            </Box>
          </Tooltip>
        </AppShell.Section>
      ) : (
        <AppShell.Section className="text-subtle flex items-center gap-1.5 px-3 pt-2 pb-3 text-[11px]">
          <Icon name="lock-simple" size={13} />
          {t("sidebar.privacy")}
        </AppShell.Section>
      )}
    </>
  );
};
