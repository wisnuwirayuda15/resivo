import { useEffect, useRef, useState } from 'react'
import { Box } from '@mantine/core'

import { cn } from '@/lib/utils'

import type { ReactNode } from 'react'

/**
 * Reveals its children once, when they first come into view.
 *
 * An `IntersectionObserver` and not a scroll listener. A scroll handler runs on
 * every frame of every scroll for the whole page, and this needs one callback
 * per element, once. It is also the reason the reveal never reverses: something
 * fading out as you scroll back up is motion with no purpose, and it makes
 * re-reading a section feel like a bug.
 *
 * What the animation is for: sequence. A landing page is read top to bottom,
 * and a section arriving a moment after the one above it is the cheapest way to
 * say which order it goes in. It is deliberately small, 10px and one opacity
 * step, because that is the whole job.
 *
 * The state lives in the DOM rather than in a class name so `landing.css` owns
 * the timing in one place, and so `prefers-reduced-motion` can override both
 * states with a single rule.
 *
 * Always a plain box. The semantic element belongs to the section around it, so
 * this never has to be told what it is wrapping.
 */

/**
 * Stagger, as a fixed set of classes.
 *
 * Tailwind reads class names out of the source, so a computed
 * `delay-[${n}ms]` would never be generated. These are the only delays the page
 * uses, and they run out at 300ms on purpose: a stagger that keeps growing
 * leaves the last item of a long grid arriving after the reader got there.
 */
const DELAYS = [
  'delay-0',
  'delay-75',
  'delay-150',
  'delay-200',
  'delay-300',
] as const

interface RevealProps {
  children: ReactNode
  /**
   * Position in a group, for the stagger. Anything past the last delay reuses
   * it, so a long list ends up arriving together rather than trailing off.
   */
  order?: number
  className?: string
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  order = 0,
  className,
}) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (element === null) {
      return
    }

    /**
     * A browser without the observer gets the content, not the animation.
     * There is no version of this worth a polyfill.
     */
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)

      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        /**
         * Shown when it comes into view, and also when it turns out to be
         * above it already.
         *
         * The second case is not hypothetical. The observer is attached on
         * mount, and a reader who arrives at a restored scroll position, or who
         * scrolls while the page is still hydrating, has sections behind them
         * that were never intersecting and so would never be reported. Those
         * would stay at zero opacity until scrolled back to. The first callback
         * carries the geometry, so the same callback can settle it.
         */
        const arrived = entries.some(
          (entry) =>
            entry.isIntersecting || entry.boundingClientRect.bottom < 0,
        )

        if (arrived) {
          setShown(true)
          observer.disconnect()
        }
      },
      // A quarter visible, and 80px early, so a section has finished arriving
      // by the time it is the thing being read.
      { threshold: 0.25, rootMargin: '0px 0px -80px 0px' },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <Box
      className={cn(DELAYS[Math.min(order, DELAYS.length - 1)], className)}
      data-reveal={shown ? 'shown' : 'pending'}
      ref={ref}
    >
      {children}
    </Box>
  )
}
