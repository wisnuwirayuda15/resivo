import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import {
  Box,
  Button,
  ColorSchemeScript,
  Text,
  mantineHtmlProps,
} from "@mantine/core";

import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Providers } from "@/components/providers";
import { SIDEBAR_RESTORE_SCRIPT } from "@/components/shell/sidebarState";

import { SERVICE_WORKER_SCRIPT } from "@/lib/serviceWorker";
import { THEME_COLOR, seo } from "@/lib/seo";

import appCss from "@/styles/global.css?url";

import type { ErrorComponentProps } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
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
const RootErrorComponent: React.FC<ErrorComponentProps> = ({ error }) => {
  const { t } = useTranslation("common");

  return (
    <Box className="bg-app min-h-dvh">
      <EmptyState
        icon="warning-circle"
        title={t("errors.somethingWrong")}
        body={t("errors.somethingWrongBody")}
        action={
          <Box className="flex flex-col items-center gap-3">
            <Button onClick={() => window.location.reload()}>
              {t("reload")}
            </Button>
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
  );
};

const RootNotFound: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <Box className="bg-app min-h-dvh">
      <EmptyState
        icon="file-text"
        title={t("errors.notFound")}
        body={t("errors.notFoundBody")}
        action={
          <Button component={Link} to="/resumes">
            {t("errors.goToResumes")}
          </Button>
        }
      />
    </Box>
  );
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      /**
       * The defaults every route inherits.
       *
       * A route's own `head` is merged after this one and wins on any tag with
       * the same name, so this is what a page that says nothing gets: the
       * landing page's own description, and no indexing claim beyond the
       * default. Every route that renders one device's data overrides
       * `robots` to say so.
       */
      ...seo({ title: "Resivo, a local-first resume builder" }),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      /**
       * What makes the app installable.
       *
       * The manifest is a static file rather than a route, so it is served
       * without waking the server and cached like any other asset. It names the
       * app, its icons, and the URL an installed copy opens at, which is
       * `/resumes` and not `/`: somebody who installed this is not a stranger
       * who needs the pitch. `src/lib/manifest.test.ts` is what keeps its name
       * and description from drifting from `seo.ts`.
       */
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
      /**
       * The `R.` mark, three times over, because no single format is enough.
       *
       * The SVG is the real one and every current browser prefers it. The 32px
       * PNG is there for Safari, which has never honoured an SVG favicon, and
       * `apple-touch-icon` for a home-screen shortcut, which is a bitmap by
       * specification, without it iOS uses a screenshot of the page. All three
       * are the same drawing; `bun run generate-favicon` writes the PNGs from
       * the SVG, along with the two the manifest names.
       */
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        rel: "icon",
        href: "/favicon-32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
    ],
  }),
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();

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
        {/* The browser chrome, per scheme.

            Written here rather than through the route's `head`, which dedupes
            meta tags by name and would keep only one of the two. Two are the
            point: a single `theme-color` paints the address bar the same in
            both schemes, and this app follows the system. The values are the
            two `--bg-app` grounds from the design system. */}
        <meta
          content={THEME_COLOR.light}
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content={THEME_COLOR.dark}
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
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
        {/* Null in development, where a worker caching unhashed dev modules
            would look like the app ignoring a saved edit. */}
        {SERVICE_WORKER_SCRIPT === null ? null : (
          <script
            dangerouslySetInnerHTML={{ __html: SERVICE_WORKER_SCRIPT }}
            suppressHydrationWarning
          />
        )}
        <HeadContent />
      </head>
      <body>
        <Providers queryClient={queryClient}>{children}</Providers>
        <Scripts />
      </body>
    </html>
  );
}
