import LogoFull from "@/assets/logo.svg?react";
import LogoAbbreviated from "@/assets/logo-mark.svg?react";

import { cn } from "@/lib/utils";

/**
 * The Resivo logo, in its two widths.
 *
 * It used to be the UI font set in semibold with a coloured full stop, and the
 * file said so: "no logo asset exists, and the design system is explicit that
 * none was invented". That is a placeholder rather than a mark, it changes if
 * the chrome's typeface ever changes, it cannot be exported, and it cannot be a
 * favicon at all.
 *
 * So this is a drawing: a monoline geometric logotype on a 96-unit grid, cap
 * height 80, one 16-unit stroke throughout. Deliberately not an imitation of
 * Instrument Sans, a logo that is merely the interface font is indistinguishable
 * from a heading, and the whole point of a mark is that it reads as one thing at
 * any size, including 16 pixels square.
 *
 * Two versions, because two widths are needed and scaling one down does not give
 * the other: `Logo` is the full wordmark for the sidebar's header, `LogoMark` is
 * the `R.` for the collapsed rail and for the favicon, where six more letters
 * would be a smear.
 *
 * The letters are `currentColor` and only the full stop is fixed, to
 * `--text-accent`, so the mark inherits whatever colour it is placed in while
 * the one accent survives both schemes. `public/favicon.svg` is the same drawing
 * with literal colours, because a favicon has no cascade to inherit from.
 */

interface LogoProps {
  /** Height and colour, if the default is wrong for the place it sits in. */
  className?: string;
}

/**
 * 14px, not the 15px the wordmark's text was set at.
 *
 * The grid puts the cap height at 80 of 96 units, so a 14px box draws an 11.7px
 * capital, which is the cap height a 15px semibold Instrument Sans was already
 * rendering. Matching the letters rather than the box is what keeps the sidebar
 * header looking untouched.
 */
const HEIGHT = "h-[14px] w-auto";

export const Logo: React.FC<LogoProps> = ({ className }) => (
  <LogoFull className={cn("text-title", HEIGHT, className)} />
);

export const LogoMark: React.FC<LogoProps> = ({ className }) => (
  <LogoAbbreviated className={cn("text-title", HEIGHT, className)} />
);
