import { lerp, progress } from "../lib/motion";

/**
 * The wordmark from `src/assets/logo.svg`, drawn on.
 *
 * The paths are the app's own, copied rather than imported because the asset is
 * loaded through svgr in the app and a webpack build has no such loader. Each
 * stroke is given `pathLength="1"` so one dash length covers any of them, and
 * the strokes start in turn so the word is written in the order it is read.
 * The two dots land after the last stroke.
 */
const STROKES = [
  "M8 100V20h30a22 22 0 0 1 0 44H8",
  "M30 64l30 36",
  "M141 73a27 27 0 1 0-11.5 22.1",
  "M87 73h54",
  "M193.7 54.9a13.5 13.5 0 1 0-12.7 18.1a13.5 13.5 0 1 1-12.7 18.4",
  "M222 46v54",
  "M249 46l24 54l24-54",
];

const DRAW = 26;
const STAGGER = 7;

/** The frame the last dot has landed on, counted from `from`. */
export const LOGO_FRAMES = (STROKES.length + 1) * STAGGER + DRAW + 18;

export const Logo = ({ frame, from }: { frame: number; from: number }) => {
  const last = from + (STROKES.length + 1) * STAGGER + DRAW;
  const dot = progress(frame, last, 12);
  const full = progress(frame, last + 6, 12);
  const ring = progress(frame, from + STROKES.length * STAGGER, DRAW);

  return (
    <svg
      className="v-logo"
      viewBox="0 12 417 96"
      fill="none"
      role="img"
      aria-label="Resivo"
    >
      <g
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {STROKES.map((d, index) => {
          const amount = progress(frame, from + index * STAGGER, DRAW);

          return (
            <path
              key={d}
              d={d}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - amount}
              opacity={amount > 0 ? 1 : 0}
            />
          );
        })}
        <circle
          cx="351"
          cy="73"
          r="27"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - ring}
          opacity={ring > 0 ? 1 : 0}
        />
      </g>
      <circle cx="222" cy="26" r={lerp(0, 8, dot)} fill="currentColor" />
      <circle
        cx="407"
        cy="98"
        r={lerp(0, 10, full)}
        fill="var(--text-accent, currentColor)"
      />
    </svg>
  );
};
