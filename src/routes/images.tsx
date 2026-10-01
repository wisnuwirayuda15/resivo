import { createFileRoute } from "@tanstack/react-router";

import { seo } from "@/lib/seo";

import { Shell } from "@/components/shell/Shell";
import { ClientOnly } from "@/components/client-only";
import { ImageGalleryView } from "@/features/assets/ImageGalleryView";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** Image gallery. Client-only, because it reads IndexedDB. */
const ImagesRoute: React.FC = () => {
  const { t } = useTranslation("shell");

  return (
    <Shell title={t("sidebar.images")}>
      <ClientOnly>
        <ImageGalleryView />
      </ClientOnly>
    </Shell>
  );
};

export const Route = createFileRoute("/images")({
  head: () => ({
    meta: seo({
      title: "Images | Resivo",
      indexable: false,
    }),
  }),
  component: ImagesRoute,
});
