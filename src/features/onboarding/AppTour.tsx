import { useEffect, useState } from 'react'
import { Button } from '@mantine/core'
import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour'
import { useMediaQuery } from '@mantine/hooks'
import { useRouterState } from '@tanstack/react-router'

import { hasSeenTour, markTourSeen } from './seen'
import { useTourPane } from '@/features/editor/tourPane'
import {
  EDITOR_STEP_PANES,
  SIDEBAR_STEP_IDS,
  TOUR_TARGET_IDS,
  tourSteps,
} from './steps'

import type { ReactNode } from 'react'
import type { TourName } from './seen'

/**
 * The onboarding tour, wrapped around the whole shell.
 *
 * It has to be an ancestor of what it points at: `OnboardingTour.Target`
 * registers itself through context, so a target outside this provider is a step
 * with nothing to highlight. Wrapping the shell rather than the page is what
 * lets a step point at the sidebar or the app bar as well as the content.
 *
 * Two tours, not one. The package matches a step to a mounted target, so a tour
 * that crossed from the library into the editor would spend half its steps
 * darkening the screen and pointing at nothing while the other route's
 * components were unmounted. Each tour runs where its anchors are, and the
 * editor's arrives the first time someone opens a resume — which is also when
 * it is useful.
 *
 * Nobody is made to finish one. `withSkipButton` is what the user asked for, and
 * skipping marks the tour seen exactly as completing it does: being shown
 * something and deciding you do not want it is an answer, not a postponement.
 */

interface AppTourProps {
  children: ReactNode
  /**
   * Bumped to start the tour again from the app menu or the palette. The
   * package starts on `started` going true, so a restart needs an edge rather
   * than a boolean that is already set.
   */
  restartSignal: number
  /**
   * Opens or closes the navbar for a step anchored inside it.
   *
   * Only ever called with `true` where the navbar is an overlay: on a wide
   * screen the sidebar is already there and nothing needs to move.
   */
  onRevealSidebar?: (reveal: boolean) => void
}

/**
 * Which side of the target the popover goes.
 *
 * `bottom` is right for a button or a sidebar row, and wrong for a pane: three
 * of the editor's anchors are full-height columns, and "below" a target taller
 * than the viewport is off the bottom of the screen — which `shift` cannot
 * rescue, because it only moves along the cross axis. Beside a tall target the
 * popover is centred on it instead, which is on screen by construction.
 *
 * A function of the controller because that is the only per-step hook the
 * package offers to `OnboardingTour.Target`: a step's own `focusRevealProps`
 * reaches the element-walking path, not the context one these targets use.
 */
const popoverPosition = (
  stepId: string | undefined,
): 'bottom' | 'left' | 'right' => {
  if (stepId === TOUR_TARGET_IDS.code || stepId === TOUR_TARGET_IDS.paper) {
    return 'right'
  }

  return stepId === TOUR_TARGET_IDS.inspector ? 'left' : 'bottom'
}

/** Which tour belongs to this route, or none. */
const tourForPath = (pathname: string): TourName | null => {
  if (/^\/resumes\/[^/]+$/.test(pathname)) {
    return 'editor'
  }

  return pathname === '/resumes' || pathname === '/' ? 'library' : null
}

export const AppTour: React.FC<AppTourProps> = ({
  children,
  restartSignal,
  onRevealSidebar,
}) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const name = tourForPath(pathname)

  /**
   * Whether the editor is showing all three panes at once. The same breakpoint
   * `EditorLayout` splits on, and what decides where the editor tour points:
   * at the panes where they exist, at the tabs that open them where they do not.
   */
  const wideEditor = useMediaQuery('(min-width: 1200px)', true, {
    getInitialValueInEffect: false,
  })

  /**
   * Whether the sidebar is a sidebar rather than a drawer. Mantine's `sm`, the
   * same breakpoint `AppShell` collapses the navbar at.
   */
  const sidebarPermanent = useMediaQuery('(min-width: 48em)', true, {
    getInitialValueInEffect: false,
  })

  /**
   * How a step asks for the editor pane it lives in. Read as a stable action
   * rather than through the hook's selector, so a pane change does not
   * re-render the whole shell.
   */
  const requestPane = useTourPane((state) => state.request)

  const [started, setStarted] = useState(false)

  /**
   * Started in an effect, never during render.
   *
   * `hasSeenTour` reads `localStorage`, which does not exist on the server —
   * and starting false on both passes is what keeps the first client render
   * identical to the markup it hydrates.
   */
  useEffect(() => {
    // `eligible` already establishes that `name` is not null, and TypeScript
    // narrows through the alias.
    if (name !== null && !hasSeenTour(name)) {
      setStarted(true)
    }
  }, [name])

  useEffect(() => {
    if (restartSignal > 0 && name !== null) {
      setStarted(true)
    }
  }, [restartSignal, name])

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
    if (name !== 'editor' || wideEditor) {
      requestPane(null)
    }
  }, [name, wideEditor, requestPane])

  const finish = () => {
    setStarted(false)
    onRevealSidebar?.(false)
    // Stops asking for a pane, which hands the tab strip back to whatever the
    // user had chosen before the tour started.
    requestPane(null)

    if (name !== null) {
      markTourSeen(name)
    }
  }

  if (name === null) {
    return children
  }

  return (
    <OnboardingTour
      // Fired for both endings, so skipping and finishing are recorded the same
      // way. There is no third outcome worth distinguishing.
      /**
       * Placement, per step.
       *
       * The package defaults to the left of the target on anything wider than
       * `sm`, which is wrong here: half these anchors are in a 232px sidebar
       * pinned to the left edge, so "left" is off the screen. Flip and shift
       * keep the result on screen from there, and the offset is positive so the
       * arrow has somewhere to sit rather than overlapping the cutout.
       */
      focusRevealProps={(controller) => ({
        popoverProps: {
          position: popoverPosition(controller.selectedStepId),
          offset: 12,
          // An 8px gutter rather than 16: the card is capped at the viewport
          // less that much, so the two numbers agreeing is what leaves it the
          // same margin on both sides instead of shifted against one edge.
          middlewares: { flip: true, shift: { padding: 8 } },
        },
      })}
      onOnboardingTourEnd={finish}
      /**
       * Two of the library's steps point at rows in the sidebar, which is a
       * drawer below `sm` — so the tour opens it for those and closes it again
       * on the way out. Without this the tour dimmed the screen, highlighted
       * nothing, and left no control on screen to go on with.
       *
       * The cutout follows: the package re-measures on a 50ms poll for 1.5s
       * after each step, which comfortably outlasts the drawer's 200ms.
       */
      onOnboardingTourChange={(step) => {
        onRevealSidebar?.(!sidebarPermanent && SIDEBAR_STEP_IDS.has(step.id))
        /**
         * And the editor's tab strip, the same way.
         *
         * Where three panes fit this asks for nothing: none of the wide tour's
         * anchors is behind a tab. Where they do not, the pane holding the
         * step has to be the active tab before the step can anchor at all,
         * since `keepMounted={false}` keeps the other two out of the document.
         * Setting it here rather than in an effect is what makes the tab change
         * and the step change one commit; the package re-measures its cutout on
         * a 50ms poll for 1.5s afterwards, which covers the pane mounting.
         *
         * A step with no pane of its own — the last one points at the app bar —
         * leaves the request where it was rather than dropping it. Releasing it
         * mid-tour would swap the pane behind the card for no reason the reader
         * can see; the release belongs at the end, and `finish` does it.
         */
        const pane = wideEditor ? undefined : EDITOR_STEP_PANES[step.id]

        if (pane !== undefined) {
          requestPane(pane)
        }
      }}
      /**
       * Skip is given a real button.
       *
       * The package draws it as a Mantine `Anchor` with no `href`, which is an
       * `<a>` that is neither focusable nor announced as anything — so the one
       * control the user was promised could only be reached with a pointer.
       */
      skipNavigation={(controller) => (
        <Button
          onClick={controller.skipTour}
          size="compact-xs"
          variant="subtle"
        >
          Skip
        </Button>
      )}
      started={started}
      tour={tourSteps(name, { wideEditor })}
      withNextButton
      withPrevButton
      withSkipButton
      withStepper
    >
      {children}
    </OnboardingTour>
  )
}
