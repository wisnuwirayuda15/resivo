import { useEffect, useState } from 'react'
import { Button } from '@mantine/core'
import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour'
import { useMediaQuery } from '@mantine/hooks'
import { useRouterState } from '@tanstack/react-router'

import { hasSeenTour, markTourSeen } from './seen'
import { TOUR_TARGET_IDS, tourSteps } from './steps'

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
}) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const name = tourForPath(pathname)

  /**
   * The editor tour only runs where the three panes it describes exist.
   *
   * Below the breakpoint the editor is one pane behind a tab strip, so four of
   * its five steps would point at components that are not mounted. Left unseen
   * rather than marked seen, so it still runs on a wider screen later.
   */
  const wide = useMediaQuery('(min-width: 1200px)', true, {
    getInitialValueInEffect: false,
  })
  const eligible = name !== null && (name !== 'editor' || wide)

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
    if (eligible && !hasSeenTour(name)) {
      setStarted(true)
    }
  }, [eligible, name])

  useEffect(() => {
    if (restartSignal > 0 && name !== null) {
      setStarted(true)
    }
  }, [restartSignal, name])

  const finish = () => {
    setStarted(false)

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
          middlewares: { flip: true, shift: { padding: 16 } },
        },
      })}
      onOnboardingTourEnd={finish}
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
      tour={tourSteps(name)}
      withNextButton
      withPrevButton
      withSkipButton
      withStepper
    >
      {children}
    </OnboardingTour>
  )
}
