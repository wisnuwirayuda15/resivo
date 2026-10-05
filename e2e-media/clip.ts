import { spawnSync } from "node:child_process";
import path from "node:path";

import type { Locator, Page } from "@playwright/test";

/**
 * What every docs clip is made of: an on-screen pointer, a virtual camera, and
 * the encode that turns a raw recording into the file the docs ship.
 *
 * The camera is not in the page. Moving the page itself (a CSS transform on the
 * app) would change every coordinate the pointer and dnd-kit read, and a drag
 * measured in a scaled document is a drag that lands somewhere else. So the
 * recording is of the app at its normal size, the spec writes down where the
 * action is as it goes (`Camera.look`), and the encode crops and scales to
 * follow it afterwards.
 */

/** The window the app is recorded in. Large on purpose: the camera crops into
 * it, and a crop of a 1920px window is shown 1:1 at the output width up to a
 * 1.5 zoom, where a smaller window would be upscaled and soft. */
export const SOURCE = { width: 1920, height: 1080 } as const;

/** What the docs show. The column they sit in is under 800px wide. */
export const OUTPUT = { width: 1280, height: 720 } as const;

/** Playwright records at a constant 25 frames a second. */
const FPS = 25;

/** The recording is enlarged this much before it is cropped, because the crop
 * filter moves in whole pixels and at 1x a slow pan visibly steps. Measured: at
 * 1x the pan shakes, at 2x it is smooth, and a larger factor only costs time. */
const OVERSCAN = 2;

/* -------------------------------------------------------------- pointer -- */

/**
 * A pointer for the recording to show.
 *
 * Playwright moves a real pointer and a browser draws none, so without this a
 * clip is a page that edits itself. It is an arrow that glides, plus a ring that
 * pulses on a press. It lives in the app's own document and is moved by the
 * spec and not by listening to the mouse: the paper is an iframe, and events
 * inside it never reach the top document's listeners.
 */
export const installCursor = (): void => {
  const mount = () => {
    const cursor = document.createElement("div");
    cursor.id = "__cursor";
    cursor.style.cssText =
      "position:fixed;left:0;top:0;width:34px;height:34px;margin:-4px 0 0 -4px;z-index:2147483647;pointer-events:none;transform:translate(1500px,500px);";
    cursor.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 28 28"><path d="M5 3l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
      '<div id="__ring" style="position:absolute;left:-12px;top:-12px;width:30px;height:30px;border-radius:50%;border:3px solid #4c6ef5;opacity:0;"></div>';
    document.body.append(cursor);

    const w = window as unknown as Record<string, unknown>;
    w["__moveCursor"] = (x: number, y: number, ms: number) => {
      cursor.style.transition = `transform ${ms}ms cubic-bezier(0.45, 0, 0.2, 1)`;
      cursor.style.transform = `translate(${x}px,${y}px)`;
    };
    w["__pressCursor"] = () => {
      document.getElementById("__ring")?.animate(
        [
          { opacity: 0.95, transform: "scale(0.4)" },
          { opacity: 0, transform: "scale(1.9)" },
        ],
        { duration: 500, easing: "ease-out" },
      );
    };
  };

  // An init script runs before the body exists, so the pointer waits for it.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
};

type CursorFn = (...args: number[]) => void;

export const moveCursor = async (
  page: Page,
  x: number,
  y: number,
  ms = 380,
): Promise<void> => {
  await page.evaluate(
    ([px, py, pms]) =>
      (window as unknown as Record<string, CursorFn>)["__moveCursor"]?.(
        px,
        py,
        pms,
      ),
    [x, y, ms] as const,
  );
  // A move of no length (a drag sets its own pace) has nothing to wait for.
  if (ms > 0) {
    await page.waitForTimeout(ms + 80);
  }
};

export const pulseCursor = (page: Page): Promise<void> =>
  page.evaluate(() =>
    (window as unknown as Record<string, CursorFn>)["__pressCursor"]?.(),
  );

/**
 * Shows which keys were pressed, for a moment, at the bottom of the window.
 *
 * A recording shows what a key did and never the key, which for a clip about
 * shortcuts is the half that matters. The badge is drawn by the spec and not by
 * listening to the keyboard, for the reason the pointer is: the paper is an
 * iframe, and its keys never reach the top document.
 */
export const showKeys = async (
  page: Page,
  keys: ReadonlyArray<string>,
  ms = 1100,
): Promise<void> => {
  await page.evaluate(
    ([labels, duration]) => {
      document.getElementById("__keys")?.remove();

      const badge = document.createElement("div");

      badge.id = "__keys";
      badge.style.cssText =
        "position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:2147483646;display:flex;gap:8px;pointer-events:none;";

      for (const label of labels) {
        const key = document.createElement("kbd");

        key.textContent = label;
        key.style.cssText =
          "font:600 22px ui-monospace,monospace;color:#fff;background:#1f2937;border:2px solid #4b5563;border-bottom-width:4px;border-radius:8px;padding:6px 14px;box-shadow:0 6px 18px rgba(0,0,0,.35);";
        badge.append(key);
      }

      document.body.append(badge);
      setTimeout(() => badge.remove(), duration);
    },
    [keys, ms] as const,
  );
};

export const centerOf = async (
  target: Locator,
): Promise<{ x: number; y: number }> => {
  // Waited for, because a page that is still settling (a route that has just
  // mounted, a panel that has just re-rendered) can report visible and then, a
  // moment later, have no box for a frame.
  await target.waitFor({ state: "visible", timeout: 10_000 });

  const box = await target.boundingBox();

  if (box === null) {
    throw new Error("nothing to point at");
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/* --------------------------------------------------------------- camera -- */

interface Shot {
  /** Seconds into the clip when the move begins. */
  at: number;
  /** The centre of the view, in recorded pixels. */
  x: number;
  y: number;
  /** 1 is the whole window. 2 shows a quarter of it. */
  zoom: number;
  /** Seconds the move takes. */
  over: number;
}

/**
 * Where the virtual camera looks, written down as the spec acts.
 *
 * `start` is the wall-clock moment the clip's first frame is, so every shot is
 * stored in the clip's own time and the encode needs no other clock.
 */
export class Camera {
  readonly shots: Shot[] = [];

  constructor(private readonly start: () => number) {}

  /** Seconds into the clip, now. */
  now(): number {
    return (Date.now() - this.start()) / 1000;
  }

  /** Moves the camera to a point, and gives it time to arrive. */
  async look(
    page: Page,
    x: number,
    y: number,
    zoom: number,
    over = 0.5,
  ): Promise<void> {
    this.shots.push({ at: this.now(), x, y, zoom, over });
    await page.waitForTimeout(over * 1000);
  }

  /** Looks at a locator, `lift` pixels below its centre so the thing it acts on
   * sits in the upper half and what it changes is in the frame as well. */
  async at(
    page: Page,
    target: Locator,
    zoom: number,
    options: { over?: number; dx?: number; dy?: number } = {},
  ): Promise<void> {
    const { x, y } = await centerOf(target);

    await this.look(
      page,
      x + (options.dx ?? 0),
      y + (options.dy ?? 0),
      zoom,
      options.over,
    );
  }
}

const num = (n: number): string => n.toFixed(3);

/**
 * One value that eases between shots, as an ffmpeg expression of time `T`.
 *
 * A nest of `if`s from the last shot back to the first: before a shot begins the
 * value is the previous one, during it the value is eased with a smoothstep
 * (slow out, slow in, which is what makes a move read as a camera and not as a
 * slide), and after the last shot it holds.
 */
const track = (
  shots: ReadonlyArray<Shot>,
  pick: (shot: Shot) => number,
): string => {
  const first = shots[0];

  if (first === undefined) {
    return "1";
  }

  let expr = num(pick(shots[shots.length - 1] ?? first));

  for (let i = shots.length - 1; i >= 1; i -= 1) {
    const shot = shots[i];
    const prev = shots[i - 1];

    if (shot === undefined || prev === undefined) {
      continue;
    }

    const from = pick(prev);
    const to = pick(shot);
    const p = `((T-${num(shot.at)})/${num(shot.over)})`;
    const eased = `(${num(from)}+(${num(to - from)})*${p}*${p}*(3-2*${p}))`;

    expr = `if(lt(T,${num(shot.at)}),${num(from)},if(lt(T,${num(shot.at + shot.over)}),${eased},${expr}))`;
  }

  return expr;
};

/** The whole video filter: normalise, enlarge, then follow the shots. */
export const cameraFilter = (shots: ReadonlyArray<Shot>): string => {
  const T = `(on/${FPS})`;
  const sub = (expr: string) => expr.replaceAll("T", T);
  const zoom = sub(track(shots, (s) => s.zoom));
  const cx = sub(track(shots, (s) => s.x * OVERSCAN));
  const cy = sub(track(shots, (s) => s.y * OVERSCAN));

  return [
    `fps=${FPS}`,
    `scale=${SOURCE.width * OVERSCAN}:${SOURCE.height * OVERSCAN}:flags=bicubic`,
    `zoompan=z='${zoom}':x='clip(${cx}-iw/zoom/2,0,iw-iw/zoom)':y='clip(${cy}-ih/zoom/2,0,ih-ih/zoom)':d=1:s=${OUTPUT.width}x${OUTPUT.height}:fps=${FPS}`,
    "format=yuv420p",
  ].join(",");
};

/* --------------------------------------------------------------- encode -- */

/** `ffmpeg` from the PATH, or the file `FFMPEG` names when it is not there. */
const FFMPEG = process.env["FFMPEG"] ?? "ffmpeg";

const run = (args: ReadonlyArray<string>): void => {
  const result = spawnSync(FFMPEG, ["-hide_banner", "-y", ...args], {
    encoding: "utf8",
  });

  if (result.error !== undefined) {
    throw new Error(
      `could not start "${FFMPEG}": install ffmpeg or set FFMPEG to its path`,
    );
  }

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed:
${result.stderr}`);
  }
};

/**
 * Turns the raw recording into the clip.
 *
 * `from` is where the app was ready, which cuts the loading screen off the
 * front; `length` cuts the tail. VP9 with a constant quality: the content is
 * mostly still, which is what that mode spends least on, and the target is under
 * a megabyte a clip because the docs do not preload them.
 */
export const encodeClip = (options: {
  raw: string;
  out: string;
  from: number;
  length: number;
  shots: ReadonlyArray<Shot>;
}): void => {
  run([
    "-ss",
    num(options.from),
    "-i",
    options.raw,
    "-t",
    num(options.length),
    "-vf",
    cameraFilter(options.shots),
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "50",
    "-b:v",
    "0",
    "-deadline",
    "good",
    "-cpu-used",
    "2",
    "-row-mt",
    "1",
    options.out,
  ]);
};

/** One frame of the finished clip, as the still shown before it plays. */
export const posterFrom = (clip: string, at: number, out: string): void => {
  run(["-ss", num(at), "-i", clip, "-frames:v", "1", "-q:v", "3", out]);
};

export const publicMedia = (name: string): string =>
  path.resolve(process.cwd(), "public", "docs-media", name);
