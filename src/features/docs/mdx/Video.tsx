import { Box, Text } from "@mantine/core";

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
 * Muted and looping because it is a demonstration and not a talk, with controls
 * left on so it can be paused, which a looping clip with no way to stop it is
 * not acceptable without. It does not autoplay: a reader who asked for reduced
 * motion has said so once to their system, and a docs page should not need to be
 * told again. `preload="none"` is the other half of that decision. A page with a
 * clip on it costs the poster and nothing more until someone presses play.
 */
export const Video: React.FC<VideoProps> = ({ src, poster, caption }) => (
  <Box className="my-6" component="figure">
    <Box
      aria-label={caption}
      className="rounded-panel border-line w-full border"
      component="video"
      controls
      loop
      muted
      playsInline
      poster={poster}
      preload="none"
      src={src}
    />
    <Text
      className="text-muted mt-2 text-center text-[13px]"
      component="figcaption"
    >
      {caption}
    </Text>
  </Box>
);
