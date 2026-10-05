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
