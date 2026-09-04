import { createFileRoute } from '@tanstack/react-router'

import { LandingPage } from '@/features/landing/LandingPage'

/**
 * The landing page.
 *
 * This route used to redirect to `/resumes`, on the reasoning that the library
 * is the app's home. It still is, for someone who has been here before: the
 * sidebar, the palette and every internal link point at `/resumes`, and that
 * remains the one canonical URL for "all my resumes".
 *
 * What the redirect left out was the first visit. An app whose whole premise is
 * that it keeps your data on your own device has to be able to say so before
 * asking anybody to type their address into it, and there was nowhere for that
 * sentence to live.
 */
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'Resivo, a local-first resume builder',
      },
      {
        name: 'description',
        content:
          'Write a resume in Markdown, style it with your own CSS, and export a PDF that matches the page. No account, no server, nothing leaves your browser.',
      },
    ],
  }),
  component: LandingPage,
})
