import { createFileRoute } from '@tanstack/react-router'

import { LandingPage } from '@/features/landing/LandingPage'
import { SITE_DESCRIPTION, seo } from '@/lib/seo'

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
    meta: seo({
      title: 'Resivo, a local-first resume builder',
      description: SITE_DESCRIPTION,
    }),
    links: [
      /**
       * The one page worth naming a canonical for.
       *
       * Relative, because the repo does not know the origin it is deployed to
       * and a hardcoded one would be wrong everywhere else. A relative
       * canonical resolves against the page, which is what makes `/` the
       * canonical form of `/index.html` or `/?utm_source=...`.
       */
      { rel: 'canonical', href: '/' },
    ],
  }),
  component: LandingPage,
})
