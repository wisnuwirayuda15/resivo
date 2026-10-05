import { continueRender, delayRender } from "remotion";

/**
 * Rendering waits for the three families before the first frame is taken.
 *
 * `@font-face` from the Fontsource CSS is lazy: the browser fetches a face when
 * something first draws with it, so a still captured straight away shows the
 * fallback font. `document.fonts.load` forces the fetch and the handle holds
 * the render until it lands. The weights listed are the ones the video uses.
 */
const FACES = [
  '400 20px "Instrument Sans Variable"',
  '500 20px "Instrument Sans Variable"',
  '600 20px "Instrument Sans Variable"',
  '400 20px "JetBrains Mono Variable"',
  '500 20px "JetBrains Mono Variable"',
  '400 20px "Source Serif 4 Variable"',
  'italic 400 20px "Source Serif 4 Variable"',
  '600 20px "Source Serif 4 Variable"',
];

export const waitForFonts = (): void => {
  const handle = delayRender("fonts");

  void Promise.all(FACES.map((face) => document.fonts.load(face)))
    .then(() => document.fonts.ready)
    .then(() => {
      continueRender(handle);
    });
};
