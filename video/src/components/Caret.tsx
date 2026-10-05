import { useCurrentFrame } from "remotion";

import { BEAT } from "../timeline";

/**
 * The text caret. It blinks on the beat, a full period every two beats, so the
 * only thing in the film that repeats is on the grid too.
 */
export const Caret = ({ solid = false }: { solid?: boolean }) => {
  const frame = useCurrentFrame();
  const on = solid || Math.floor(frame / (BEAT / 2)) % 2 === 0;

  return <span className="v-caret" data-on={on} />;
};
