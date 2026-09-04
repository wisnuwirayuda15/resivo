import { Box } from '@mantine/core'

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
export const LandingPage: React.FC = () => (
  <Box className="bg-app min-h-dvh">
    <noscript>
      <style>{'[data-reveal]{opacity:1;transform:none}'}</style>
    </noscript>

    <LandingNav />
    <Hero />
    <Surfaces />
    <TemplateShowcase />
    <LocalFirst />
    <Capabilities />
    <Closing />
  </Box>
)
