import { useEffect, useState } from "react";
import { Tour } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouterState } from "@tanstack/react-router";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { hasSeenTour, markTourSeen } from "./seen";
import { useTourPane } from "@/features/editor/tourPane";
import {
  EDITOR_STEP_PANES,
  SIDEBAR_STEP_IDS,
  tourSelector,
  tourSteps,
} from "./steps";

import type { TourName } from "./seen";

/**
 * The onboarding tour, rendered beside the shell.
 *
 * Mantine's `Tour` finds its anchors by selector (`data-tour`), so it does not
 * have to be an ancestor of what it points at, and a step can point at the
 * sidebar or the app bar as well as the content.
 *
 * Two tours, not one. A step waits for its anchor to mount, so a tour that
 * crossed from the library into the editor would spend half its steps darkening
 * the screen and pointing at nothing while the other route's components were
 * unmounted. Each tour runs where its anchors are, and the editor's arrives the
 * first time someone opens a resume, which is also when it is useful.
 *
 * Nobody is made to finish one. Skip is always on the card, and skipping marks
 * the tour seen exactly as completing it does: being shown something and
 * deciding you do not want it is an answer, not a postponement. The card has no
 * close button of its own, because it would be a second control for the same
 * answer and a second button with the name "End" on the last step.
 */

interface AppTourProps {
  /**
   * Bumped to start the tour again from the app menu or the palette. A restart
   * needs an edge rather than a boolean that is already set.
   */
  restartSignal: number;
  /**
   * Opens or closes the navbar for a step anchored inside it.
   *
   * Only ever called with `true` where the navbar is an overlay: on a wide
   * screen the sidebar is already there and nothing needs to move.
   */
  onRevealSidebar?: (reveal: boolean) => void;
}

/**
 * The widest the card gets, which is also the width it keeps on any screen
 * with room for it.
 *
 * Mantine's default is 360px, which is a narrow measure for paragraphs this
 * long and read as cramped on the very screen with room to spare. On a phone
 * the tour already takes the room there is, less an 8px gutter, so 460px is only
 * the point where a paragraph of this length stops gaining from more.
 */
const CARD_MAX_WIDTH = 460;

/** Which tour belongs to this route, or none. */
const tourForPath = (pathname: string): TourName | null => {
  if (/^\/resumes\/[^/]+$/.test(pathname)) {
    return "editor";
  }

  // Not '/', which is the landing page and has no shell to point at.
  return pathname === "/resumes" ? "library" : null;
};

export const AppTour: React.FC<AppTourProps> = ({
  restartSignal,
  onRevealSidebar,
}) => {
  const { t } = useTranslation("onboarding");
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const name = tourForPath(pathname);

  /**
   * Whether the editor is showing all three panes at once. The same breakpoint
   * `EditorLayout` splits on, and what decides where the editor tour points:
   * at the panes where they exist, at the tabs that open them where they do not.
   */
  const wideEditor = useMediaQuery("(min-width: 1200px)", true, {
    getInitialValueInEffect: false,
  });

  /**
   * Whether the sidebar is a sidebar rather than a drawer. Mantine's `sm`, the
   * same breakpoint `AppShell` collapses the navbar at.
   */
  const sidebarPermanent = useMediaQuery("(min-width: 48em)", true, {
    getInitialValueInEffect: false,
  });

  /**
   * How a step asks for the editor pane it lives in. Read as a stable action
   * rather than through the hook's selector, so a pane change does not
   * re-render the whole shell.
   */
  const requestPane = useTourPane((state) => state.request);

  const [started, setStarted] = useState(false);

  /**
   * Started in an effect, never during render.
   *
   * `hasSeenTour` reads `localStorage`, which does not exist on the server,
   * and starting false on both passes is what keeps the first client render
   * identical to the markup it hydrates.
   */
  useEffect(() => {
    // `eligible` already establishes that `name` is not null, and TypeScript
    // narrows through the alias.
    if (name !== null && !hasSeenTour(name)) {
      setStarted(true);
    }
  }, [name]);

  useEffect(() => {
    if (restartSignal > 0 && name !== null) {
      setStarted(true);
    }
  }, [restartSignal, name]);

  /**
   * A request dropped wherever it no longer applies.
   *
   * `finish` covers a tour that ends. This covers the two ways one stops
   * applying without ending: navigating out of the editor, which would
   * otherwise leave the next resume opening on whichever tab the tour reached,
   * and the window growing past the three-pane breakpoint, where there is no
   * tab strip for a request to mean anything to.
   */
  useEffect(() => {
    if (name !== "editor" || wideEditor) {
      requestPane(null);
    }
  }, [name, wideEditor, requestPane]);

  const finish = () => {
    setStarted(false);
    onRevealSidebar?.(false);
    // Stops asking for a pane, which hands the tab strip back to whatever the
    // user had chosen before the tour started.
    requestPane(null);

    if (name !== null) {
      markTourSeen(name);
    }
  };

  if (name === null) {
    return null;
  }

  const steps = tourSteps(name, t, { wideEditor });

  return (
    <Tour
      active={started}
      closeOnEscape
      // Keyed by the tour, so one that carries on across a route change starts
      // its steps from the first rather than from an index the other tour owns.
      key={name}
      labels={{
        skip: t("buttons.skip"),
        back: t("buttons.prev"),
        next: t("buttons.next"),
        // The last step's button, and the only place this label is shown.
        close: t("buttons.end"),
        stepCounter: (current, total) =>
          t("buttons.stepCounter", { current, total }),
      }}
      maxWidth={CARD_MAX_WIDTH}
      // Fired for every ending, so skipping and finishing are recorded the same
      // way. There is no third outcome worth distinguishing.
      onClose={finish}
      /**
       * Two of the library's steps point at rows in the sidebar, which is a
       * drawer below `sm`, so the tour opens it for those and closes it again
       * on the way out. Without this the tour dimmed the screen, highlighted
       * nothing, and left no control on screen to go on with. The card follows
       * the drawer as it slides in: the tour re-measures its anchor as it moves.
       *
       * And the editor's tab strip, the same way. Where three panes fit this
       * asks for nothing: none of the wide tour's anchors is behind a tab.
       * Where they do not, the pane holding the step has to be the active tab
       * before the step can anchor at all, since `keepMounted={false}` keeps the
       * other two out of the document. The tour waits for an anchor that is not
       * mounted yet and picks it up when it appears, which is what makes asking
       * from here, once the step is open, enough.
       *
       * A step with no pane of its own, the last one points at the app bar,
       * leaves the request where it was rather than dropping it. Releasing it
       * mid-tour would swap the pane behind the card for no reason the reader
       * can see; the release belongs at the end, and `finish` does it.
       */
      onStepOpen={(index) => {
        const step = steps[index];

        if (step === undefined) {
          return;
        }

        onRevealSidebar?.(!sidebarPermanent && SIDEBAR_STEP_IDS.has(step.id));

        const pane = wideEditor ? undefined : EDITOR_STEP_PANES[step.id];

        if (pane !== undefined) {
          requestPane(pane);
        }
      }}
      withCloseButton={false}
    >
      {steps.map((step) => (
        <Tour.Step
          key={step.id}
          position={step.position}
          target={tourSelector(step.id)}
          title={step.title}
        >
          {step.content}
        </Tour.Step>
      ))}
    </Tour>
  );
};
