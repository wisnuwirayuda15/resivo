import { Fragment } from "react";
import { useCurrentFrame } from "remotion";

import { lerp, progress, STANDARD } from "../lib/motion";
import { Mark } from "./Mark";
import { height, sceneFrom, width } from "../timeline";

import type { SceneName } from "../timeline";
import type { CSSProperties } from "react";

/**
 * The cuts between scenes.
 *
 * A fade and a short rise read as nothing, so each cut is a panel that sweeps
 * across the whole frame, covers the old scene, and uncovers the new one. The
 * scene changes underneath it, on the first frame of the bar, which is the
 * moment the panel is at full cover: the viewer sees a hit and not a join.
 *
 * Two layers make one panel. The front one, in the accent, is what covers the
 * cut. The back one, a lighter teal, comes in a few frames ahead of it and
 * leaves a few frames after, so there is always a second edge following the
 * first. The six cuts are six different shapes, because the same wipe six times
 * is the thing that read as boring.
 */
type Kind = "sweep" | "shutters" | "iris" | "diagonal" | "push" | "columns";

const CUTS: ReadonlyArray<{ into: SceneName; kind: Kind }> = [
  { into: "write", kind: "sweep" },
  { into: "templates", kind: "shutters" },
  { into: "ats", kind: "iris" },
  { into: "themes", kind: "diagonal" },
  { into: "export", kind: "push" },
  { into: "outro", kind: "columns" },
];

/** Frames to cover, to uncover, and by how many the back layer leads and trails. */
const COVER = 14;
const REVEAL = 16;
const LAG = 4;

/** Where each layer sits in time: when it starts covering and uncovering. */
const LAYERS: ReadonlyArray<{
  color: string;
  cover: number;
  reveal: number;
}> = [
  { color: "var(--p-300)", cover: LAG, reveal: -LAG },
  { color: "var(--accent)", cover: 0, reveal: 0 },
];

const BARS = 6;

/** A staggered 0 to 1, for the pieces of a shutter. */
const piece = (
  t: number,
  index: number,
  start: number,
  duration: number,
): number =>
  progress(t, start + index * 2, duration - (BARS - 1) * 2, STANDARD);

const Layer = ({
  kind,
  color,
  t,
  cover,
  reveal,
}: {
  kind: Kind;
  color: string;
  t: number;
  cover: number;
  reveal: number;
}) => {
  const all: CSSProperties = { position: "absolute", background: color };

  if (kind === "sweep") {
    // A slanted leading edge, travelling right to left across the frame.
    const travel = width + 360;

    return (
      <div
        style={{
          ...all,
          top: 0,
          left: 0,
          width: travel,
          height,
          clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)",
          transform: `translateX(${(1 - cover) * travel - reveal * travel}px)`,
        }}
      />
    );
  }

  if (kind === "push") {
    // A panel with a curved top edge, travelling bottom to top.
    return (
      <div
        style={{
          ...all,
          top: 0,
          left: 0,
          width,
          height: height + 240,
          borderRadius: "50% 50% 0 0 / 160px 160px 0 0",
          transform: `translateY(${(1 - cover) * (height + 240) - reveal * (height + 240)}px)`,
        }}
      />
    );
  }

  if (kind === "diagonal") {
    // A slab turned 24 degrees, travelling along its own length.
    const slab = 3600;
    const travel = lerp(-slab * 0.9, 0, cover) + reveal * slab * 0.9;

    return (
      <div
        style={{
          ...all,
          top: height / 2 - slab / 2,
          left: width / 2 - slab / 2,
          width: slab,
          height: slab,
          transform: `rotate(24deg) translateX(${travel}px)`,
        }}
      />
    );
  }

  if (kind === "iris") {
    // A disc that opens from the middle to cover, then a hole that opens to
    // uncover.
    const radius = (reveal > 0 ? reveal : cover) * 1320;
    const gradient =
      reveal > 0
        ? `radial-gradient(circle at 50% 50%, transparent ${radius}px, ${color} ${radius + 1}px)`
        : `radial-gradient(circle at 50% 50%, ${color} ${radius}px, transparent ${radius + 1}px)`;

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: radius <= 0 && reveal === 0 ? "none" : gradient,
        }}
      />
    );
  }

  // Shutters (rows) and columns: six bars that close in turn, from alternating
  // sides, and open from the side they did not close from.
  const rows = kind === "shutters";
  const size = (rows ? height : width) / BARS;

  return (
    <>
      {Array.from({ length: BARS }, (_, index) => {
        const close = piece(t + 0, index, -COVER, COVER);
        const open = piece(t + 0, index, 0, REVEAL);
        const scale = Math.min(cover, close) * (1 - Math.min(reveal, open));
        const fromStart = index % 2 === 0;
        const origin = open > 0 ? !fromStart : fromStart;
        const side = origin ? 0 : 100;

        return (
          <div
            key={index}
            style={{
              ...all,
              ...(rows
                ? { left: 0, top: index * size, width, height: size + 1 }
                : { top: 0, left: index * size, width: size + 1, height }),
              transformOrigin: rows ? `${side}% 50%` : `50% ${side}%`,
              transform: rows ? `scaleX(${scale})` : `scaleY(${scale})`,
            }}
          />
        );
      })}
    </>
  );
};

export const Transitions = () => {
  const frame = useCurrentFrame();

  return (
    <div className="v-cut-layer">
      {CUTS.map(({ into, kind }) => {
        const t = frame - sceneFrom(into);

        if (t < -COVER - LAG || t > REVEAL + LAG) {
          return null;
        }

        return (
          <Fragment key={into}>
            {LAYERS.map((layer) => {
              const cover = progress(t + layer.cover, -COVER, COVER, STANDARD);
              const reveal = progress(t + layer.reveal, 0, REVEAL, STANDARD);

              if (cover <= 0 || reveal >= 1) {
                return null;
              }

              return (
                <Layer
                  key={layer.color}
                  kind={kind}
                  color={layer.color}
                  t={t + layer.cover}
                  cover={cover}
                  reveal={reveal}
                />
              );
            })}
            {t >= -10 && t <= 5 ? <Mark t={t} /> : null}
          </Fragment>
        );
      })}
    </div>
  );
};
