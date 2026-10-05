import { Composition } from "remotion";

import { Promo } from "./Promo";
import { fps, height, TOTAL_FRAMES, width } from "./timeline";
import { waitForFonts } from "./lib/fonts";

import "./video.css";

waitForFonts();

export const Root = () => (
  <Composition
    id="Promo"
    component={Promo}
    durationInFrames={TOTAL_FRAMES}
    fps={fps}
    width={width}
    height={height}
  />
);
