import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * What can be checked about the soundtrack without listening to it.
 *
 * Loudness and peak, and whether there is a sound where the timeline says one
 * should be. Whether it sounds good is a different question and a person has to
 * answer it. Needs ffmpeg: set `FFMPEG` to its path, or have it on the PATH.
 */
const here = dirname(fileURLToPath(import.meta.url));
const wav = join(here, "..", "public", "soundtrack.wav");
const timeline = JSON.parse(
  readFileSync(join(here, "..", "src", "timeline.json"), "utf8"),
);
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";

const run = (args, options = {}) => {
  const result = spawnSync(ffmpeg, args, {
    maxBuffer: 1 << 28,
    ...options,
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  return result;
};

// ---------------------------------------------------------------------------
// Loudness
// ---------------------------------------------------------------------------

const loud = run(
  [
    "-hide_banner",
    "-nostats",
    "-i",
    wav,
    "-af",
    "ebur128=peak=true",
    "-f",
    "null",
    "-",
  ],
  { encoding: "utf8" },
).stderr;
const summary = loud.slice(loud.lastIndexOf("Summary:"));
const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]);

console.log(
  `integrated loudness  ${integrated} LUFS   (target -16, accepted -17.5 to -14.5)`,
);
console.log(`true peak            ${peak} dBFS   (accepted at most -1)`);

// ---------------------------------------------------------------------------
// Cues
// ---------------------------------------------------------------------------

const RATE = 16_000;
const decoded = run([
  "-v",
  "error",
  "-i",
  wav,
  "-ac",
  "1",
  "-ar",
  String(RATE),
  "-f",
  "f32le",
  "-",
]).stdout;
const samples = new Float32Array(
  decoded.buffer,
  decoded.byteOffset,
  Math.floor(decoded.byteLength / 4),
);

const HOP = 80;
const frames = Math.floor(samples.length / HOP);
const energy = new Float64Array(frames);

for (let index = 0; index < frames; index += 1) {
  let sum = 0;

  for (let at = 0; at < HOP; at += 1) {
    const value = samples[index * HOP + at] ?? 0;

    sum += value * value;
  }

  energy[index] = Math.sqrt(sum / HOP);
}

/** Mean energy of the hops between two times, in seconds. */
const level = (from, to) => {
  const first = Math.max(0, Math.floor((from * RATE) / HOP));
  const last = Math.min(frames - 1, Math.ceil((to * RATE) / HOP));
  let sum = 0;

  for (let index = first; index <= last; index += 1) {
    sum += (energy[index] ?? 0) ** 2;
  }

  return Math.sqrt(sum / Math.max(1, last - first + 1));
};

const fps = timeline.fps;
const bar = (60 / timeline.bpm) * 4;
const SOUNDS = ["chips", "swaps", "clicks", "dings", "flips", "thumps"];

const cues = Object.values(timeline.scenes).flatMap((scene) =>
  SOUNDS.flatMap((key) =>
    (scene.events?.[key] ?? []).map((frame) => ({
      key,
      time: scene.bar * bar + frame / fps,
    })),
  ),
);

let found = 0;
const missed = [];

/**
 * A cue is heard when the 50 ms after it are at least 1.25 times as loud as the
 * 60 ms before it. Music under it that is already loud at that moment can hide
 * a quiet effect from this test without hiding it from a listener, so a miss is
 * a place to listen to and not a fault.
 */
for (const cue of cues) {
  const after = level(cue.time, cue.time + 0.05);
  const before = level(cue.time - 0.07, cue.time - 0.01);

  if (after >= before * 1.25) {
    found += 1;
  } else {
    missed.push(`${cue.key} at ${cue.time.toFixed(2)} s`);
  }
}

console.log(
  `cues with a sound on them  ${found} of ${cues.length}` +
    (missed.length === 0 ? "" : `   missing: ${missed.join(", ")}`),
);

const ok = integrated >= -17.5 && integrated <= -14.5 && peak <= -1;

console.log(ok ? "loudness: ok" : "loudness: out of range");
process.exitCode = ok ? 0 : 1;
