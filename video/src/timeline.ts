import timeline from "./timeline.json";

/**
 * The one clock the picture and the sound share.
 *
 * Everything is placed on a grid of beats at 120 BPM, which is 30 frames at
 * 60 fps, because the reference films cut on the first beat of a bar and a cut
 * that lands between beats reads as a mistake once there is music under it.
 * `scripts/generate-audio.mjs` reads the same JSON, so a scene that moves moves
 * its sound with it.
 */
export const { fps, bpm, width, height } = timeline;

export const BEAT = Math.round((fps * 60) / bpm);
export const BAR = BEAT * 4;

export type SceneName = keyof typeof timeline.scenes;

const SCENES = Object.keys(timeline.scenes) as Array<SceneName>;

export const sceneFrom = (name: SceneName): number =>
  timeline.scenes[name].bar * BAR;

export const sceneLength = (name: SceneName): number =>
  timeline.scenes[name].bars * BAR;

export const TOTAL_FRAMES = SCENES.reduce(
  (total, name) => Math.max(total, sceneFrom(name) + sceneLength(name)),
  0,
);
