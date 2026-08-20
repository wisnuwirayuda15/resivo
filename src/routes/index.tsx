import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The library is the app's home. Redirecting rather than duplicating it here
 * keeps one canonical URL for "all my resumes", which the sidebar links to.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/resumes' })
  },
})
