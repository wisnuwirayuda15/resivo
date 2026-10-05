import { ENTRANCE, lerp, progress, STANDARD } from "../lib/motion";

/**
 * The `R.` mark from `src/assets/logo-mark.svg`, for the middle of a cut.
 *
 * Copied for the reason `Logo` is: the asset is loaded through svgr in the app,
 * and a webpack build has no such loader. The stroke is white on the panel, the
 * full stop a light teal (the app's accent is the panel's own colour here, so it
 * would vanish).
 *
 * `t` is the frame counted from the bar line, where the panel is at full cover.
 * The mark grows into place as the cover closes and is gone five frames after
 * the bar line, because the iris opens a hole in the middle that quickly and
 * a white mark over the new scene would be invisible.
 */
export const Mark = ({ t }: { t: number }) => {
  const enter = progress(t, -10, 10, ENTRANCE);
  const leave = progress(t, 0, 5, STANDARD);
  const scale = lerp(0.55, 1, enter) + leave * 0.3;

  return (
    <svg
      className="v-mark"
      viewBox="0 12 99 96"
      fill="none"
      role="img"
      aria-label="Resivo"
      style={{
        opacity: enter * (1 - leave),
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      <g
        stroke="#ffffff"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 100V20h30a22 22 0 0 1 0 44H8" />
        <path d="M30 64l30 36" />
      </g>
      <circle cx="89" cy="98" r="10" fill="var(--p-200)" />
    </svg>
  );
};
