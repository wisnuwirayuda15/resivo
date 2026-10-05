import { interpolate, useCurrentFrame } from "remotion";

import { STANDARD } from "../lib/motion";

/**
 * The pointer, drawn on top of the film.
 *
 * Playwright's recordings have no cursor, and a film about an interface needs
 * one: it is what tells the eye which control caused which change. The path is
 * a list of waypoints and the pointer eases between each pair, holds at the
 * last one, and a click is a ring that opens from where the pointer was.
 */
export interface Waypoint {
  frame: number;
  x: number;
  y: number;
}

export const positionAt = (
  frame: number,
  path: ReadonlyArray<Waypoint>,
): { x: number; y: number } => {
  const first = path[0];
  const last = path[path.length - 1];

  if (first === undefined || last === undefined) {
    return { x: 0, y: 0 };
  }

  if (frame <= first.frame) {
    return { x: first.x, y: first.y };
  }

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];

    if (from !== undefined && to !== undefined && frame <= to.frame) {
      const amount = interpolate(frame, [from.frame, to.frame], [0, 1], {
        easing: STANDARD,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

      return {
        x: from.x + (to.x - from.x) * amount,
        y: from.y + (to.y - from.y) * amount,
      };
    }
  }

  return { x: last.x, y: last.y };
};

/** Frames a click is held for, for a control to read as pressed. */
export const PRESS = 6;

/** Frames the ring of a click takes to open and fade. */
const RING = 22;

export const isPressed = (frame: number, click: number | undefined): boolean =>
  click !== undefined && frame >= click && frame < click + PRESS;

export const Cursor = ({
  path,
  clicks,
}: {
  path: ReadonlyArray<Waypoint>;
  clicks: ReadonlyArray<number>;
}) => {
  const frame = useCurrentFrame();
  const { x, y } = positionAt(frame, path);

  return (
    <div className="v-cursor-layer">
      {clicks.map((click) => {
        const age = frame - click;

        if (age < 0 || age > RING) {
          return null;
        }

        const at = positionAt(click, path);
        const open = age / RING;

        return (
          <span
            key={click}
            className="v-ring"
            style={{
              left: at.x,
              top: at.y,
              opacity: 0.7 * (1 - open),
              transform: `translate(-50%, -50%) scale(${0.4 + open * 1.5})`,
            }}
          />
        );
      })}
      <svg
        className="v-cursor"
        width="44"
        height="44"
        viewBox="0 0 24 24"
        style={{ left: x, top: y }}
      >
        <path
          d="M3 2v17l4.6-4.1 3 6.6 2.6-1.2-3-6.5H17z"
          fill="#ffffff"
          stroke="#1d1d1a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
