import { Box, Text } from "@mantine/core";

import { VideoPlayer } from "@/components/VideoPlayer";

interface VideoProps {
  /** A file under `public/docs-media`, as a path from the site root. */
  src: string;
  /** The still shown before it plays, and the only frame a reader on a slow
   * connection ever downloads, since the clip itself is not preloaded. */
  poster: string;
  /** What the clip shows. It is the caption and the accessible name both, and
   * the only text of the clip that reaches the `.md`, `llms.txt` and MCP forms
   * of the page, so it has to say what a reader there would otherwise miss. */
  caption: string;
}

/**
 * A short screen recording of the app, played in place.
 *
 * Muted and looping because it is a demonstration and not a talk, with the
 * player's controls on so it can be paused, which a looping clip with no way to
 * stop it is not acceptable without. It does not autoplay, and the player
 * fetches nothing but the poster until someone presses play: see `VideoPlayer`.
 */
export const Video: React.FC<VideoProps> = ({ src, poster, caption }) => (
  <Box className="my-6" component="figure">
    <VideoPlayer label={caption} loop poster={poster} src={src} />
    <Text
      className="text-muted mt-2 text-center text-[13px]"
      component="figcaption"
    >
      {caption}
    </Text>
  </Box>
);
