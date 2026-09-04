import { Link } from "@tanstack/react-router";
import { Box, Text, Tooltip } from "@mantine/core";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";

import { cn } from "@/lib/utils";
import { Icon } from "@/features/icons/IconRenderer";

import type { ComponentProps, ReactElement, ReactNode } from "react";

/**
 * Shared appearance for a sidebar row.
 *
 * Exported as a class-name builder plus a content component rather than one
 * closed component, because rows differ in what they *are*: some are plain
 * links, some carry search params (whose types TanStack derives from the target
 * route, so they cannot be funnelled through one loose prop), and some are
 * buttons. This way every variant is fully type-checked and still looks
 * identical.
 *
 * Selection is an accent-tinted fill, never a coloured left border bar.
 *
 * `collapsed` is the rail: the label and the count go, the icon centres, and the
 * label moves into a tooltip. It is the row's own concern rather than a wrapper's
 * because a 26px row centred inside a 60px rail is a different row, not the same
 * row clipped, a clipped one would put its icon 10px from the left edge and
 * hide the rest.
 */
export const navItemClassName = (active = false, collapsed = false): string =>
  cn(
    "flex items-center gap-2.5 rounded-control text-[13px]",
    "h-[26px] transition-colors duration-fast ease-standard",
    // A centred 34px pill on the rail, not a full-width one: a fill that
    // reaches both edges of a 60px column reads as a band across the sidebar
    // rather than as one row being selected.
    collapsed ? "mx-auto w-[34px] justify-center px-0" : "w-full px-2.5",
    active
      ? "bg-selected text-accent font-medium"
      : "text-muted hover:bg-hover hover:text-body",
  );

interface NavItemContentProps {
  icon: string;
  label: string;
  /** Shown right-aligned. A zero is omitted rather than displayed, so an empty
   * group reads as empty instead of as a count of nothing. */
  count?: number;
  /** Rail: icon only. */
  collapsed?: boolean;
}

export const NavItemContent: React.FC<NavItemContentProps> = ({
  icon,
  label,
  count,
  collapsed = false,
}) => (
  <>
    <Icon name={icon} size={16} />
    {collapsed ? null : (
      <>
        <Text className="flex-1 truncate text-left" span>
          {label}
        </Text>
        {count === undefined || count === 0 ? null : (
          <Text className="text-subtle font-mono text-[11px]" span>
            {count}
          </Text>
        )}
      </>
    )}
  </>
);

/**
 * Wraps a collapsed row so its label is still reachable.
 *
 * Only on the rail. A tooltip on a row that already says what it is would fire
 * on every pass of the pointer down the list and tell nobody anything.
 *
 * A function returning an element rather than a component, so the expanded case
 * hands back the row *itself*. A component would have to return a fragment
 * there, and `OnboardingTour.Target` reaches for its child element, a fragment
 * is not one, and the tour's step for the Images row then had nothing to point
 * at. It failed silently, as a step with no anchor does.
 */
const withRailLabel = (
  collapsed: boolean,
  label: string,
  row: ReactElement,
): ReactElement =>
  collapsed ? (
    <Tooltip label={label} offset={10} position="right">
      {row}
    </Tooltip>
  ) : (
    row
  );

type NavLinkProps = NavItemContentProps &
  Pick<ComponentProps<typeof Link>, "to"> & {
    active?: boolean;
    /** Lets the mobile navbar overlay dismiss itself once a row is tapped. */
    onNavigate?: () => void;
  };

/**
 * A row that navigates to a route with no search params.
 *
 * `tourId` opts the row in as an onboarding-tour anchor. It is a prop rather
 * than a spread of the rest, because these components deliberately do not
 * forward arbitrary props, a nav row is not a generic element.
 */
export const NavLink: React.FC<NavLinkProps & { tourId?: string }> = ({
  icon,
  label,
  count,
  to,
  active = false,
  collapsed = false,
  onNavigate,
  tourId,
}) => {
  const link = withRailLabel(
    collapsed,
    label,
    <Link
      to={to}
      onClick={onNavigate}
      className={navItemClassName(active, collapsed)}
      // Named explicitly on the rail, where the only thing left in the row is
      // a glyph and a tooltip, which a screen reader never reads.
      aria-label={collapsed ? label : undefined}
      // Driven by the caller rather than by `activeProps`: several rows share one
      // route and differ only by their search params.
      aria-current={active ? "page" : undefined}
    >
      <NavItemContent
        icon={icon}
        label={label}
        count={count}
        collapsed={collapsed}
      />
    </Link>,
  );

  return tourId === undefined ? (
    link
  ) : (
    <OnboardingTour.Target id={tourId}>{link}</OnboardingTour.Target>
  );
};

/** A row that performs an action instead of navigating. */
export const NavButton: React.FC<
  NavItemContentProps & { onClick: () => void; active?: boolean }
> = ({ icon, label, count, onClick, active = false, collapsed = false }) =>
  withRailLabel(
    collapsed,
    label,
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      className={navItemClassName(active, collapsed)}
    >
      <NavItemContent
        icon={icon}
        label={label}
        count={count}
        collapsed={collapsed}
      />
    </button>,
  );

interface NavGroupProps {
  /** Uppercase micro-label. Omitted for the first, unlabelled group. */
  label?: string;
  /** Rail: the micro-label goes, since there is no width to set it in. */
  collapsed?: boolean;
  children: ReactNode;
}

export const NavGroup: React.FC<NavGroupProps> = ({
  label,
  collapsed = false,
  children,
}) => (
  <Box className={cn("pb-1.5", collapsed ? "px-2" : "px-2.5")}>
    {label === undefined ? null : collapsed ? (
      /* A rule instead of the words. The grouping is the part that still means
         something in a rail; the name of the group is what the tooltips say. */
      <Box className="bg-line-soft mx-auto mt-3 mb-2 h-px w-5" />
    ) : (
      <Text
        className="text-subtle px-2.5 pt-3 pb-1.5 text-[10px] font-medium tracking-[0.06em] uppercase"
        component="div"
      >
        {label}
      </Text>
    )}
    <Box className="flex flex-col gap-px">{children}</Box>
  </Box>
);
