import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The film's soundtrack, written sample by sample.
 *
 * Nothing here is recorded or downloaded: the music and every effect are
 * synthesised from `src/timeline.json`, the same file the picture reads, so a
 * scene that moves takes its sound with it and there is no licence to check.
 * The output is deterministic (the noise comes from a seeded generator), which
 * means the same JSON always gives the same bytes.
 *
 * 120 BPM, a beat is a quarter of a second. The harmony is a plain
 * I, vi, IV, V cycle in C, one chord to a bar, because the film's job is to
 * make cuts on the bar line feel intended and a plain cycle does that without
 * asking to be listened to.
 */

const here = dirname(fileURLToPath(import.meta.url));
const timeline = JSON.parse(
  readFileSync(join(here, "..", "src", "timeline.json"), "utf8"),
);

const RATE = 48_000;
const { fps, bpm } = timeline;
const BEAT = 60 / bpm;
const BAR = BEAT * 4;

const sceneEntries = Object.entries(timeline.scenes);
const BARS = sceneEntries.reduce(
  (total, [, scene]) => Math.max(total, scene.bar + scene.bars),
  0,
);
const SECONDS = BARS * BAR;
const SAMPLES = Math.round(SECONDS * RATE);

const left = new Float32Array(SAMPLES);
const right = new Float32Array(SAMPLES);
// Effects go to their own bus so the music can be mixed under them.
const fxLeft = new Float32Array(SAMPLES);
const fxRight = new Float32Array(SAMPLES);

/** A small, fixed pseudo-random sequence, so the render is reproducible. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const random = seeded(20_260_705);

const midi = (note) => 440 * 2 ** ((note - 69) / 12);

/**
 * Adds a voice to a bus. `voice(t)` is the mono sample at `t` seconds from the
 * start of the note, and `pan` runs from -1 (left) to 1 (right).
 */
const add = (bus, start, length, voice, gain = 1, pan = 0) => {
  const [a, b] = bus;
  const first = Math.max(0, Math.floor(start * RATE));
  const last = Math.min(SAMPLES, Math.ceil((start + length) * RATE));
  const toLeft = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const toRight = gain * Math.sin(((pan + 1) * Math.PI) / 4);

  for (let index = first; index < last; index += 1) {
    const sample = voice(index / RATE - start);

    a[index] += sample * toLeft;
    b[index] += sample * toRight;
  }
};

const music = [left, right];
const fx = [fxLeft, fxRight];

/** Attack and release around a held note. */
const hold = (t, length, attack, release) =>
  Math.min(1, t / attack) * Math.min(1, Math.max(0, (length - t) / release));

// ---------------------------------------------------------------------------
// Harmony
// ---------------------------------------------------------------------------

const CHORDS = {
  C: { root: 36, pad: [60, 64, 67, 71] },
  Am: { root: 33, pad: [57, 60, 64, 67] },
  F: { root: 41, pad: [57, 60, 65, 69] },
  G: { root: 31, pad: [59, 62, 67, 69] },
  Em: { root: 40, pad: [59, 62, 64, 67] },
};

const PROGRESSION = [
  "C",
  "C",
  "Am",
  "Am",
  "F",
  "F",
  "G",
  "G",
  "C",
  "Em",
  "Am",
  "F",
  "G",
  "C",
  "C",
];

/** How much of each layer is present in a bar, 0 to about 1.2. */
const level = {
  arp: (bar) =>
    [0, 0.55, 1, 1, 1, 1, 1, 1, 1.15, 1.15, 1.15, 1, 1, 0.7, 0.4][bar] ?? 0,
  drums: (bar) => (bar >= 2 && bar <= 12 ? 1 : 0),
  hats: (bar) => (bar >= 3 && bar <= 12 ? 1 : 0),
  bass: (bar) => (bar >= 1 && bar <= 13 ? 1 : 0),
};

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------

const pad = (bar) => {
  const chord = CHORDS[PROGRESSION[bar]];
  const start = bar * BAR;
  const length = BAR + 0.5;

  chord.pad.forEach((note, index) => {
    const frequency = midi(note);
    const pan = (index - 1.5) * 0.25;

    for (const detune of [-3, 3]) {
      const f = frequency * 2 ** (detune / 1200);

      add(
        music,
        start,
        length,
        (t) =>
          (Math.sin(2 * Math.PI * f * t) +
            0.35 * Math.sin(2 * Math.PI * f * 2 * t)) *
          hold(t, length, 0.5, 0.7),
        0.03,
        pan,
      );
    }
  });
};

const pluck = (start, note, gain, pan) => {
  const f = midi(note);

  add(
    music,
    start,
    0.9,
    (t) =>
      (Math.sin(2 * Math.PI * f * t) +
        0.35 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 18) +
        0.12 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 24)) *
      Math.min(1, t / 0.003) *
      Math.exp(-t * 7.5),
    gain,
    pan,
  );
};

const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

const arpeggio = (bar) => {
  const amount = level.arp(bar);

  if (amount === 0) {
    return;
  }

  const chord = CHORDS[PROGRESSION[bar]];

  for (let step = 0; step < 8; step += 1) {
    const note = chord.pad[ARP[step]] + 12;
    const accent = step % 4 === 0 ? 1 : 0.72;

    pluck(
      bar * BAR + step * (BEAT / 2),
      note,
      0.11 * amount * accent,
      step % 2 === 0 ? -0.3 : 0.3,
    );
  }
};

const bass = (bar) => {
  if (level.bass(bar) === 0) {
    return;
  }

  const chord = CHORDS[PROGRESSION[bar]];
  const f = midi(chord.root);

  for (const beat of [0, 2]) {
    const length = beat === 0 ? BEAT * 1.8 : BEAT * 1.4;

    add(
      music,
      bar * BAR + beat * BEAT,
      length,
      (t) =>
        (Math.sin(2 * Math.PI * f * t) +
          0.25 * Math.sin(2 * Math.PI * f * 2 * t)) *
        hold(t, length, 0.01, 0.25),
      beat === 0 ? 0.2 : 0.14,
    );
  }
};

const kick = (start, gain) => {
  add(
    music,
    start,
    0.3,
    // The phase is the integral of a pitch that falls from 116 Hz to 46 Hz.
    (t) =>
      Math.sin(2 * Math.PI * (46 * t + (70 / 28) * (1 - Math.exp(-t * 28)))) *
      Math.exp(-t * 11) *
      Math.min(1, t / 0.002),
    gain,
  );
};

const noiseBurst = (bus, start, length, gain, tone, pan = 0) => {
  // A noise burst through a one-pole high-pass, `tone` being its coefficient.
  let previousIn = 0;
  let previousOut = 0;

  add(
    bus,
    start,
    length,
    (t) => {
      const input = random() * 2 - 1;
      const output = tone * (previousOut + input - previousIn);

      previousIn = input;
      previousOut = output;

      return output * Math.exp(-t / (length / 5));
    },
    gain,
    pan,
  );
};

const drums = (bar) => {
  if (level.drums(bar) === 0) {
    return;
  }

  for (const beat of [0, 1, 2, 3]) {
    kick(bar * BAR + beat * BEAT, beat % 2 === 0 ? 0.28 : 0.16);
  }

  if (level.hats(bar) !== 0) {
    for (let step = 0; step < 8; step += 1) {
      const off = step % 2 === 1;

      noiseBurst(
        music,
        bar * BAR + step * (BEAT / 2),
        off ? 0.06 : 0.035,
        off ? 0.05 : 0.025,
        0.94,
        off ? 0.25 : -0.25,
      );
    }
  }
};

for (let bar = 0; bar < BARS; bar += 1) {
  pad(bar);
  arpeggio(bar);
  bass(bar);
  drums(bar);
}

// ---------------------------------------------------------------------------
// Effects, placed from the timeline
// ---------------------------------------------------------------------------

const seconds = (frames) => frames / fps;

const tick = (start) => {
  const f = 1400 + random() * 500;

  add(
    fx,
    start,
    0.04,
    (t) =>
      (Math.sin(2 * Math.PI * f * t) * 0.5 + (random() * 2 - 1) * 0.5) *
      Math.exp(-t * 120),
    0.06,
    (random() - 0.5) * 0.4,
  );
};

const pop = (start, index) => {
  const f = 640 + (index % 3) * 70;

  add(
    fx,
    start,
    0.18,
    // A short drop in pitch, from f + 160 Hz down to f, is what makes it a pop.
    (t) =>
      Math.sin(2 * Math.PI * (f * t + (160 / 30) * (1 - Math.exp(-t * 30)))) *
      Math.exp(-t * 26) *
      Math.min(1, t / 0.002),
    0.2,
    ((index % 5) - 2) * 0.14,
  );
  noiseBurst(fx, start, 0.04, 0.07, 0.9);
};

const click = (start) => {
  add(
    fx,
    start,
    0.05,
    (t) => Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 90),
    0.12,
  );
  noiseBurst(fx, start, 0.03, 0.09, 0.92);
};

const ding = (start) => {
  for (const [f, g] of [
    [1318.5, 0.14],
    [1975.5, 0.09],
    [2637, 0.04],
  ]) {
    add(
      fx,
      start,
      1.6,
      (t) =>
        Math.sin(2 * Math.PI * f * t) *
        Math.exp(-t * 3.2) *
        Math.min(1, t / 0.003),
      g,
    );
  }
};

const swap = (start, index) => {
  const f = 880 + (index % 4) * 110;

  add(
    fx,
    start,
    0.14,
    (t) =>
      Math.sin(2 * Math.PI * f * t) *
      Math.exp(-t * 34) *
      Math.min(1, t / 0.002),
    0.13,
    index % 2 === 0 ? -0.2 : 0.2,
  );
};

/** Filtered noise that rises into a cut and ends on its first frame. */
const whoosh = (end, length = 0.45, gain = 0.1) => {
  let low = 0;

  add(
    fx,
    end - length,
    length,
    (t) => {
      const progress = t / length;
      const coefficient = 0.02 + 0.5 * progress ** 2;

      low += coefficient * (random() * 2 - 1 - low);

      return low * progress ** 1.6;
    },
    gain * 3,
  );
};

const thump = (start) => {
  add(
    fx,
    start,
    1.2,
    (t) =>
      Math.sin(2 * Math.PI * (38 * t + (62 / 6) * (1 - Math.exp(-t * 6)))) *
      Math.exp(-t * 3.2) *
      Math.min(1, t / 0.004),
    0.4,
  );
};

const flip = (start) => {
  click(start);
  add(
    fx,
    start,
    0.5,
    (t) =>
      Math.sin(2 * Math.PI * (330 + 660 * (t / 0.5)) * t) *
      Math.exp(-t * 7) *
      0.5,
    0.1,
  );
};

const EVENT_SOUND = {
  chips: pop,
  swaps: swap,
  clicks: click,
  dings: ding,
  flips: flip,
  thumps: thump,
};

for (const [, scene] of sceneEntries) {
  const origin = scene.bar * BAR;
  const events = scene.events ?? {};

  // Every cut after the first is announced by a rise into the bar line.
  if (scene.bar > 0) {
    whoosh(origin);
  }

  if (events.type !== undefined) {
    const type = events.type;

    if (type.every !== undefined) {
      for (let index = 0; index < type.count; index += 1) {
        tick(origin + seconds(type.from + index * type.every));
      }
    } else {
      // The editor types on an ease-in curve, so the ticks thicken with it.
      const count = 44;

      for (let index = 0; index < count; index += 1) {
        const at = (index / count) ** (1 / 2.1);

        tick(origin + seconds(type.from + at * type.frames));
      }
    }
  }

  for (const [key, play] of Object.entries(EVENT_SOUND)) {
    (events[key] ?? []).forEach((frame, index) => {
      play(origin + seconds(frame), index);
    });
  }
}

// ---------------------------------------------------------------------------
// Delay, mix, master
// ---------------------------------------------------------------------------

/** A dotted eighth ping-pong delay on the music, which is what makes a plain
 * pluck sound like it is in a room. */
const pingPong = (inLeft, inRight, time, feedback, mix) => {
  const offset = Math.round(time * RATE);
  const lineLeft = new Float32Array(SAMPLES);
  const lineRight = new Float32Array(SAMPLES);
  const outLeft = new Float32Array(SAMPLES);
  const outRight = new Float32Array(SAMPLES);

  for (let index = 0; index < SAMPLES; index += 1) {
    // Each side feeds the other, which is what makes the echo travel.
    const echoLeft = index >= offset ? lineRight[index - offset] : 0;
    const echoRight = index >= offset ? lineLeft[index - offset] : 0;

    lineLeft[index] = inLeft[index] + echoLeft * feedback;
    lineRight[index] = inRight[index] + echoRight * feedback;
    outLeft[index] = inLeft[index] + echoLeft * mix;
    outRight[index] = inRight[index] + echoRight * mix;
  }

  return [outLeft, outRight];
};

const [wetLeft, wetRight] = pingPong(left, right, BEAT * 0.75, 0.4, 0.3);

/**
 * The balance, set by `check-audio.mjs` and not by ear. With the music at full
 * level most of the effects (a pop on a beat that already has a kick under it)
 * cannot be told from the music: 14 of the 38 cues stood out. At 0.6 and 2.4
 * 34 of them do, the whole track measures about -16.5 LUFS and the true peak is
 * -1.7 dB, which leaves the room a loudness-normalising player will want. The
 * environment variables are for trying another mix without editing the file.
 */
const MUSIC_GAIN = Number(process.env.AUDIO_MUSIC ?? 0.6);
const FX_GAIN = Number(process.env.AUDIO_FX ?? 2.4);
const MASTER = Number(process.env.AUDIO_MASTER ?? 1.7);

const fadeIn = 0.04;
const fadeOut = 1.4;

const out = new Int16Array(SAMPLES * 2);

for (let index = 0; index < SAMPLES; index += 1) {
  const time = index / RATE;
  const envelope =
    Math.min(1, time / fadeIn) *
    Math.min(1, Math.max(0, (SECONDS - time) / fadeOut));
  const l =
    (wetLeft[index] * MUSIC_GAIN + fxLeft[index] * FX_GAIN) * MASTER * envelope;
  const r =
    (wetRight[index] * MUSIC_GAIN + fxRight[index] * FX_GAIN) *
    MASTER *
    envelope;

  // A soft knee so a pile-up of effects bends instead of clipping.
  out[index * 2] = Math.round(Math.tanh(l * 1.1) * 0.89 * 32767);
  out[index * 2 + 1] = Math.round(Math.tanh(r * 1.1) * 0.89 * 32767);
}

const bytes = Buffer.alloc(44 + out.length * 2);

bytes.write("RIFF", 0);
bytes.writeUInt32LE(36 + out.length * 2, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(RATE, 24);
bytes.writeUInt32LE(RATE * 4, 28);
bytes.writeUInt16LE(4, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(out.length * 2, 40);
Buffer.from(out.buffer).copy(bytes, 44);

const target = join(here, "..", "public", "soundtrack.wav");

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, bytes);

console.log(
  `soundtrack.wav: ${SECONDS.toFixed(1)} s, ${BARS} bars, ${(bytes.length / 1e6).toFixed(1)} MB`,
);
