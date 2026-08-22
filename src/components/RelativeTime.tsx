import { useEffect, useState } from 'react'
import { Text } from '@mantine/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

dayjs.extend(relativeTime)
dayjs.extend(utc)

interface RelativeTimeProps {
  /** Epoch milliseconds. */
  value: number
  className?: string
}

/**
 * A timestamp rendered as "2 hours ago", safely under SSR.
 *
 * "Time ago" is computed from the clock at render, so the server and the browser
 * will disagree — by the network round trip at least, and by far more if the
 * machine clocks differ. Rendering it directly is therefore a guaranteed
 * hydration mismatch, and one that only shows up once the component is used
 * outside a client-only boundary.
 *
 * So the relative form is deferred to an effect. The server and the first client
 * render both emit an absolute date, and the swap to relative happens after
 * hydration, when only the browser's clock is involved.
 *
 * That absolute date is formatted **in UTC** rather than local time. Formatting
 * locally would reintroduce the same class of bug through a different door: the
 * Nitro server's timezone need not match the browser's, so a timestamp near
 * midnight would render as two different dates. UTC is the one frame of
 * reference both sides are guaranteed to agree on. It is on screen only until the
 * effect runs.
 *
 * The `<time>` element keeps the machine-readable instant available regardless of
 * which form is currently displayed.
 */
/**
 * The pre-hydration label: the timestamp's UTC calendar date.
 *
 * Exported so the timezone-independence that makes it hydration-safe is covered
 * by a test rather than only by the comment above.
 */
export const absoluteLabel = (value: number): string =>
  dayjs(value).utc().format('D MMM YYYY')

export const RelativeTime: React.FC<RelativeTimeProps> = ({
  value,
  className,
}) => {
  const [label, setLabel] = useState(() => absoluteLabel(value))

  useEffect(() => {
    setLabel(dayjs(value).fromNow())

    // Refresh while the card stays open, so "a few seconds ago" does not sit
    // there going stale. A minute is fine: the phrasing only changes on that
    // scale anyway.
    const timer = setInterval(() => setLabel(dayjs(value).fromNow()), 60_000)

    return () => clearInterval(timer)
  }, [value])

  return (
    <Text
      className={className}
      component="time"
      dateTime={new Date(value).toISOString()}
    >
      {label}
    </Text>
  )
}
