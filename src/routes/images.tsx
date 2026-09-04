import { createFileRoute } from "@tanstack/react-router";

import { seo } from "@/lib/seo";

import { Shell } from "@/components/shell/Shell";
import { ClientOnly } from "@/components/client-only";
import { ImageGalleryView } from "@/features/assets/ImageGalleryView";

/** Image gallery. Client-only, because it reads IndexedDB. */
const ImagesRoute: React.FC = () => (
  <Shell title="Images">
    <ClientOnly>
      <ImageGalleryView />
    </ClientOnly>
  </Shell>
);

export const Route = createFileRoute("/images")({
  head: () => ({
    meta: seo({
      title: "Images | Resivo",
      indexable: false,
    }),
  }),
  component: ImagesRoute,
});
