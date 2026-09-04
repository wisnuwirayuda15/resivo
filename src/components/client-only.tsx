import { useEffect, useState } from "react";

import type { ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  /** Rendered on the server and during the first client paint. Give it the same
   * footprint as the real content so hydration does not shift the layout. */
  fallback?: ReactNode;
}

/**
 * Defers rendering until after hydration.
 *
 * Resivo keeps TanStack Start's SSR shell, but all user data lives in IndexedDB
 * and the editor depends on Monaco, an iframe and pointer measurement, none of
 * which exist on the server. Anything reading the database or touching `window`
 * belongs inside one of these.
 *
 * Rendering the fallback on the first client pass as well (rather than only on
 * the server) is deliberate: the server and client markup then agree, so React
 * never reports a hydration mismatch.
 */
export const ClientOnly: React.FC<ClientOnlyProps> = ({
  children,
  fallback = null,
}) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return <>{hydrated ? children : fallback}</>;
};
