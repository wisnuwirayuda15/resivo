import { Box, Text } from "@mantine/core";

import { VideoPlayer } from "@/components/VideoPlayer";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { Reveal } from "./Reveal";

/**
 * The 28 second film, under the hero.
 *
 * The player fetches nothing but the 125 KB poster until someone presses play
 * (the film is 11 MB), and it has sound, so it never autoplays. It is served
 * from this origin like everything else on the page, so playing it sends nothing
 * to a third party. It is made by `video/` from the app's own code (see `CLAUDE.md`),
 * and `bun run video:publish` is what puts a new cut at these two addresses.
 *
 * No captions track: there is no speech in it, only music, and what it shows is
 * on screen in large type.
 */

const FILM = "/promo/resivo-promo.mp4";
const POSTER = "/promo/resivo-promo.jpg";

export const Tour: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <Box className="border-line-soft border-t" component="section" id="tour">
      <Box className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8">
        <Reveal>
          <Text
            className="text-title max-w-[24ch] text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[30px]"
            component="h2"
          >
            {t("tour.title")}
          </Text>
          <Text className="text-muted mt-4 max-w-[62ch] text-[14px] leading-relaxed">
            {t("tour.body")}
          </Text>
        </Reveal>

        <Reveal className="mt-10" order={1}>
          <VideoPlayer label={t("tour.label")} poster={POSTER} src={FILM} />
        </Reveal>
      </Box>
    </Box>
  );
};
