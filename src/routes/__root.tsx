import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import {
  Box,
  Button,
  ColorSchemeScript,
  Text,
  mantineHtmlProps,
} from '@mantine/core'

import { EmptyState } from '@/components/EmptyState'
import { Providers } from '@/components/providers'
import { SIDEBAR_RESTORE_SCRIPT } from '@/components/shell/sidebarState'

import appCss from '@/styles/global.css?url'

import type { ErrorComponentProps } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

/**
 * Last-resort error screen.
 *
 * Without one, an error that escapes a route renders TanStack's bare fallback,
 * which tells the user nothing and (worse for debugging) makes a render error
 * indistinguishable from a blank page. Names what failed and offers the way back,
 * per the design system's rule for errors: no error code in the primary line, no
 * apology.
 */
const RootErrorComponent: React.FC<ErrorComponentProps> = ({ error }) => (
  <Box className="bg-app min-h-dvh">
    <EmptyState
      icon="warning-circle"
      title="Something went wrong"
      body="Your resumes are stored on this device and are unaffected. Reload to try again."
      action={
        <Box className="flex flex-col items-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          {/* The message is for the user's bug report, so it is shown rather
              than swallowed, but kept out of the primary line. */}
          <Text
            className="text-subtle max-w-[60ch] text-[11px] break-words"
            component="code"
          >
            {error instanceof Error ? error.message : String(error)}
          </Text>
        </Box>
      }
    />
  </Box>
)

const RootNotFound: React.FC = () => (
  <Box className="bg-app min-h-dvh">
    <EmptyState
      icon="file-text"
      title="Page not found"
      body="That address does not exist in Resivo."
      action={
        <Button component={Link} to="/resumes">
          Go to resumes
        </Button>
      }
    />
  </Box>
)

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Resivo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      /**
       * The `R.` mark, three times over, because no single format is enough.
       *
       * The SVG is the real one and every current browser prefers it. The 32px
       * PNG is there for Safari, which has never honoured an SVG favicon, and
       * `apple-touch-icon` for a home-screen shortcut, which is a bitmap by
       * specification, without it iOS uses a screenshot of the page. All three
       * are the same drawing; `bun run generate-favicon` writes the PNGs from
       * the SVG.
       */
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        href: '/favicon-32.png',
        type: 'image/png',
        sizes: '32x32',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()

  return (
    /**
     * `mantineHtmlProps` carries `suppressHydrationWarning`, which this document
     * genuinely needs: the server renders a fixed colour scheme, then
     * `ColorSchemeScript` rewrites the attribute from the stored preference or
     * `prefers-color-scheme` before React hydrates. Without it, every visit in
     * dark mode would warn.
     */
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        {/* Beside the colour-scheme script because it is the same problem: a
            preference this browser holds that the server-rendered markup cannot
            know, and that has to be settled before the first paint rather than
            corrected after it. Without this the sidebar would paint at its full
            width and then jump to the rail. */}
        <script
          dangerouslySetInnerHTML={{ __html: SIDEBAR_RESTORE_SCRIPT }}
          suppressHydrationWarning
        />
        <HeadContent />
      </head>
      <body>
        <Providers queryClient={queryClient}>{children}</Providers>
        <Scripts />
      </body>
    </html>
  )
}
