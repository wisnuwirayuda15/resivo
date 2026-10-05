import { useCurrentFrame } from "remotion";

import type { CSSProperties, ReactNode } from "react";

/**
 * The surface every scene sits on.
 *
 * The pattern slides a quarter of a pixel a frame, 15 pixels a second, which is
 * too slow to read as motion and enough to keep a held frame alive. It wraps
 * at 384 pixels, four grid cells, which is the tile of the plus marks, so the
 * loop has no seam.
 */
const TILE = 384;
const SPEED = 0.25;

export const Backdrop = ({
  children,
  from = 0,
}: {
  children: ReactNode;
  /**
   * The frame of the whole film this scene starts on. A second backdrop inside
   * a scene reads the scene's own clock, and without this it would slide from a
   * different place than the one under it.
   */
  from?: number;
}) => {
  const frame = useCurrentFrame();
  const drift = ((frame + from) * SPEED) % TILE;

  return (
    <div
      className="v-backdrop"
      style={{ "--drift": `${drift}px` } as CSSProperties}
    >
      {children}
    </div>
  );
};
