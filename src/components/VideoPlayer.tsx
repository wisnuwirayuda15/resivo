import { Video } from "@gfazioli/mantine-video";

import { cn } from "@/lib/utils";

/**
 * The one video player in the app, for the landing film and the docs clips.
 *
 * Mantine Video and not the browser's own `controls`. Every browser draws its
 * control bar differently (Chrome's dark pill, Safari's translucent bar,
 * Firefox's own again), and none of them follow the app's theme, so a clip
 * looked like three different products depending on who opened the page. This
 * draws one bar, in the app's accent, radius and colour scheme, and the same
 * keyboard shortcuts everywhere.
 *
 * `preload="none"` is the part to keep when editing this: the landing film is
 * 11 MB, and a page with a player on it costs its poster and nothing more until
 * someone presses play. Never autoplayed, since a reader who asked their system
 * for reduced motion should not need to say so again.
 */

interface VideoPlayerProps {
  src: string;
  poster: string;
  /** What it shows. The accessible name of the player. */
  label: string;
  /** For a clip that is a demonstration rather than a film: muted and looping. */
  loop?: boolean;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  label,
  loop = false,
  className,
}) => (
  <Video
    aria-label={label}
    aspectRatio={16 / 9}
    color="brand"
    className={cn("border-line-soft border", className)}
    loop={loop}
    muted={loop}
    poster={poster}
    preload="none"
    radius="panel"
    role="group"
    src={src}
  />
);
