import { useEffect, useState } from "react";
import { AppShell, Burger, Overlay } from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { ClientOnly } from "@/components/client-only";
import { AppTour } from "@/features/onboarding/AppTour";
import { CommandPalette } from "@/features/commands/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { NewGroupDialog } from "@/features/resume/components/NewGroupDialog";
import { NewResumeDialog } from "@/features/resume/components/NewResumeDialog";

import { AppBar } from "./AppBar";
import { Sidebar } from "./Sidebar";
import { applySidebarCollapsed, readSidebarCollapsed } from "./sidebarState";

import type { ReactNode } from "react";
import type { DocumentKind } from "@/features/resume/model/document";

interface ShellProps {
  title: string;
  /** Set where the title names something the person can rename in place. */
  onTitleChange?: (title: string) => void;
  actions?: ReactNode;
  children: ReactNode;
  activeGroupId?: string;
  /** True when the current view is the unfiltered library. */
  allActive?: boolean;
  /** Set when the library is showing only cover letters. */
  activeKind?: DocumentKind;
}

/**
 * The application frame, built on Mantine's `AppShell`.
 *
 * `layout="alt"` puts the navbar at full viewport height with the header offset
 * beside it, which is the design system's arrangement: the wordmark sits at the
 * top of the sidebar, and the application bar starts where the sidebar ends.
 *
 * `padding={0}` because each view owns its own padding, the design system uses
 * 24px in content views but none in the editor, which fills the viewport edge to
 * edge. The prop still has to be set explicitly, since `AppShell` uses it to
 * compute section offsets.
 *
 * The sidebar reads group counts from IndexedDB, so it sits inside a
 * `ClientOnly` boundary; the header and content column render on the server.
 */
export const Shell: React.FC<ShellProps> = ({
  title,
  onTitleChange,
  actions,
  children,
  activeGroupId,
  allActive = false,
  activeKind,
}) => {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();
  const [navOpened, { toggle: toggleNav, close: closeNav }] =
    useDisclosure(false);
  const [newResumeOpen, setNewResumeOpen] = useState(false);
  /** Set by the command that makes a letter, and cleared when the dialog goes. */
  const [newKind, setNewKind] = useState<DocumentKind | undefined>(undefined);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  // Owned here rather than in the app bar, so the same sheet can be opened from
  // anywhere that needs to.
  const [shortcutsOpen, shortcuts] = useDisclosure(false);
  /**
   * A counter rather than a boolean.
   *
   * The tour starts on `started` going true, so asking for it a second time
   * needs an edge to fire on, and by then the flag from the first run is
   * already set.
   */
  const [tourRequests, setTourRequests] = useState(0);

  /**
   * The navbar held open by the tour, kept apart from the one the user opened.
   *
   * Separate so the scrim below stays tied to the user's own gesture: the tour
   * already dims everything except its cutout, and a second veil over that
   * would darken the very row it is pointing at.
   */
  const [tourNav, setTourNav] = useState(false);

  /**
   * Read lazily rather than in an effect, and safe to: nothing the server
   * renders depends on it. The width is a CSS variable that a script in the
   * document head has already set, the toggle's label does not change with the
   * state, and the sidebar itself is client-only, so this can be the stored
   * value on the very first client render without contradicting the markup it
   * is hydrating.
   */
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(readSidebarCollapsed);
  const toggleSidebar = () => setSidebarCollapsed((collapsed) => !collapsed);

  // Declarative rather than done in the toggle, so the attribute and the
  // preference cannot drift from the state that drives the rail's contents. On
  // the first pass it agrees with the head script and does nothing.
  useEffect(() => {
    applySidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  /**
   * The shortcut every editor with a sidebar has.
   *
   * Mantine's default `tagsToIgnore` keeps it out of the Markdown and CSS
   * panes, whose editable surface is a `textarea`, the same exclusion the undo
   * shortcut relies on. It also cancels the browser's own binding, which matters
   * on Firefox, where Ctrl+B opens the bookmarks sidebar.
   */
  useHotkeys([["mod+B", toggleSidebar]]);

  return (
    /* Outside the shell, because a tour step points at the sidebar and the app
       bar as well as at the content, and a target has to be below the provider
       to register itself. */
    <AppTour onRevealSidebar={setTourNav} restartSignal={tourRequests}>
      <AppShell
        layout="alt"
        // The height and width come from the tokens rather than from literals,
        // so `h-toolbar` and `w-sidebar` elsewhere cannot drift out of step with
        // the shell they are lining up against.
        header={{ height: "var(--spacing-toolbar)" }}
        navbar={{
          // Through the variable rather than the token, so the rail can be
          // switched from an attribute on `<html>` before the first paint.
          width: "var(--sidebar-width)",
          breakpoint: "sm",
          // Below the breakpoint the sidebar becomes an overlay, opened by the
          // burger in the header. Desktop keeps it permanently visible.
          collapsed: { mobile: !navOpened && !tourNav },
        }}
        padding={0}
        transitionDuration={200}
        transitionTimingFunction="cubic-bezier(0.2, 0.7, 0.3, 1)"
      >
        {/* Tapping the page closes the navbar.

            Below the breakpoint the navbar is a full-width sheet over the
            content, and Mantine draws nothing behind it, so a tap outside it
            was swallowed by the sheet and the only way back was the burger. A
            scrim is both halves of the fix: it takes the tap, and it says the
            thing behind it is not available. Under the navbar and header in the
            stack, so the burger that opened it still closes it. */}
        {navOpened ? (
          <Overlay
            // The same ink and blur the design system gives a modal overlay,
            // because this is one: while it is up, the page behind is not
            // available.
            backgroundOpacity={0.42}
            blur={2}
            hiddenFrom="sm"
            onClick={closeNav}
            // Under the navbar (101) and the header (100), so the sheet stays
            // lit and the burger that opened it still closes it.
            zIndex={99}
          />
        ) : null}

        {/* A drawer, not the whole screen.

            Mantine forces the navbar to 100% width below its breakpoint, which
            left nothing beside it to tap and put it over the header, so the
            burger that opened it was underneath it, and the only way out was to
            navigate somewhere. A Tailwind utility wins over that rule because
            the utilities layer comes after Mantine's, with no `!important`. */}
        <AppShell.Navbar className="bg-surface max-sm:w-[min(300px,84vw)]">
          <ClientOnly>
            <Sidebar
              onNewResume={() => {
                setNewResumeOpen(true);
                closeNav();
              }}
              activeKind={activeKind}
              onNewGroup={() => {
                setNewGroupOpen(true);
                closeNav();
              }}
              // Tapping a destination on mobile should dismiss the overlay.
              onNavigate={closeNav}
              activeGroupId={activeGroupId}
              allActive={allActive}
              collapsed={sidebarCollapsed}
            />
          </ClientOnly>
        </AppShell.Navbar>

        <AppShell.Header className="bg-surface">
          <AppBar
            title={title}
            {...(onTitleChange === undefined ? {} : { onTitleChange })}
            actions={actions}
            onShowShortcuts={shortcuts.open}
            onStartTour={() => setTourRequests((count) => count + 1)}
            onToggleSidebar={toggleSidebar}
            burger={
              <Burger
                opened={navOpened}
                onClick={toggleNav}
                hiddenFrom="sm"
                size="sm"
                aria-label={t("appBar.toggleNavigation")}
              />
            }
          />
        </AppShell.Header>

        <AppShell.Main>{children}</AppShell.Main>

        <ClientOnly>
          <NewResumeDialog
            opened={newResumeOpen}
            {...(newKind === undefined ? {} : { defaultKind: newKind })}
            onClose={() => {
              setNewResumeOpen(false);
              setNewKind(undefined);
            }}
            onCreated={(id) =>
              navigate({ to: "/resumes/$resumeId", params: { resumeId: id } })
            }
          />
          <NewGroupDialog
            opened={newGroupOpen}
            onClose={() => setNewGroupOpen(false)}
          />
          <KeyboardShortcuts onClose={shortcuts.close} opened={shortcutsOpen} />
          <CommandPalette
            onNewGroup={() => setNewGroupOpen(true)}
            onNewResume={() => setNewResumeOpen(true)}
            onNewLetter={() => {
              setNewKind("coverLetter");
              setNewResumeOpen(true);
            }}
            onShowShortcuts={shortcuts.open}
            onStartTour={() => setTourRequests((count) => count + 1)}
            onToggleSidebar={toggleSidebar}
          />
        </ClientOnly>
      </AppShell>
    </AppTour>
  );
};
