import { QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools'

import { theme } from '@/styles/theme'

import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'

interface ProvidersProps {
  queryClient: QueryClient
  children: ReactNode
}

/**
 * Application providers, nested in the order:
 * QueryClientProvider → MantineProvider → DatesProvider → app + Notifications + Devtools.
 *
 * The `queryClient` is created per-request in the router context and passed in
 * here so React Query and the router's SSR integration share one client.
 */
export const Providers: React.FC<ProvidersProps> = ({
  queryClient,
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        deduplicateInlineStyles
      >
        <DatesProvider settings={{}}>
          {children}
          <Notifications />
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: 'TanStack Query',
                render: <ReactQueryDevtoolsPanel />,
              },
              {
                name: 'TanStack Form',
                render: <FormDevtoolsPanel />,
              },
            ]}
          />
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}
