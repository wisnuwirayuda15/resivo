import { Box, Loader } from "@mantine/core";

import { cn } from "@/lib/utils";

import { useImageUrl } from "../useAssetUrls";

import type { ImageSummary } from "@/database/index";

interface ThumbProps {
  image: ImageSummary;
  /** Draws the accent border. Only the inspector's grid has a selection. */
  selected?: boolean;
}

/**
 * One stored image, drawn from the object-URL cache.
 *
 * The loader is not decoration: the bytes come out of IndexedDB one row at a
 * time, so a grid genuinely paints in stages the first time it is opened.
 */
export const Thumb: React.FC<ThumbProps> = ({ image, selected = false }) => {
  const resolved = useImageUrl(image.id);

  return (
    <Box
      className={cn(
        "rounded-control border-line-soft relative flex size-full items-center justify-center overflow-hidden border",
        selected ? "border-accent" : null,
      )}
    >
      {resolved === undefined ? (
        <Loader size={14} />
      ) : (
        <img
          alt={image.name}
          className="size-full object-cover"
          src={resolved.url}
        />
      )}
    </Box>
  );
};
