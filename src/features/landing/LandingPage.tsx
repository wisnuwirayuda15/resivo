import { Box } from '@mantine/core'

import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

import { Capabilities } from './Capabilities'
import { Closing } from './Closing'
import { Hero } from './Hero'
import { LandingNav } from './LandingNav'
import { LocalFirst } from './LocalFirst'
import { Surfaces } from './Surfaces'
import { TemplateShowcase } from './TemplateShowcase'

/**
 * The landing page.
 *
 * Deliberately outside `Shell`. The app frame is a sidebar, a route title and
 * a command palette, all of which belong to someone who is already working;
 * this page has one job, which is to explain the app to a stranger and then get
 * out of the way.
 *
 * It renders on the server like the rest of the SSR shell. Nothing here reads
 * IndexedDB, so there is no client-only boundary and no loading state: the
 * whole page is in the first response.
 *
 * The reveals need JavaScript, so the block below hands the page to a reader
 * without it. One rule, unlayered, which beats the layered pending state in
 * `landing.css` whatever the order.
 */

/**
 * What the page is, for a machine reading it.
 *
 * Only the claims the page itself makes, and no `offers` block: how the app is
 * licensed is not something this file gets to decide. Rendered as a script tag
 * rather than through the route's `head`, because `head` takes meta and link
 * tags and this is neither.
 */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Resume builder',
  operatingSystem: 'Any, runs in a web browser',
  description: SITE_DESCRIPTION,
  featureList: [
    'Write a resume in Markdown',
    'Edit the page directly',
    'Style it with your own CSS',
    'Measured page breaks',
    'Export to PDF, self-contained HTML or Markdown',
    'Stores everything in the browser, with no account and no server',
  ],
}

export const LandingPage: React.FC = () => (
  <Box className="bg-app min-h-dvh">
    <noscript>
      <style>{'[data-reveal]{opacity:1;transform:none}'}</style>
    </noscript>

    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      type="application/ld+json"
    />

    <LandingNav />
    <Hero />
    <Surfaces />
    <TemplateShowcase />
    <LocalFirst />
    <Capabilities />
    <Closing />
  </Box>
)
