import { Easing, interpolate } from "remotion";

/**
 * The app's two curves (`--ease-entrance` and `--ease-standard` in
 * `tokens.css`), so a card in the film moves the way a panel in the app does.
 * There is no spring: the app has no bounce, and the film should not invent
 * one.
 */
export const ENTRANCE = Easing.bezier(0.16, 1, 0.3, 1);
export const STANDARD = Easing.bezier(0.2, 0.7, 0.3, 1);

/** 0 to 1 over `duration` frames from `from`, clamped on both sides. */
export const progress = (
  frame: number,
  from: number,
  duration: number,
  easing: (input: number) => number = ENTRANCE,
): number =>
  interpolate(frame, [from, from + duration], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

/**
 * The fall of a card that is dropped: it speeds up and is at full speed when it
 * arrives, so the arrival is the moment of impact and the sound can be put on
 * it. The first version used the entrance curve for the fall, which is nearly
 * done after a quarter of its run, so the card looked landed about 18 frames
 * before the pop that was timed to its last frame.
 */
export const GRAVITY = Easing.in(Easing.quad);

/**
 * The few frames after a card lands, as a scale: a 4 percent swell that settles.
 * 1 before the landing, so the card is not touched while it is still falling.
 */
export const landing = (frame: number, at: number): number =>
  frame < at ? 1 : 1 + 0.04 * (1 - progress(frame, at, 10, ENTRANCE));
