import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import { ENTRANCE, lerp, progress } from "../lib/motion";
import { sceneFrom, sceneLength } from "../timeline";

import type { SceneName } from "../timeline";
import type { ReactNode } from "react";

/**
 * One scene on the timeline.
 *
 * A scene starts on the first frame of a bar, which is where the music changes,
 * and eases in over a few frames so the cut reads as a cut and not as a flash.
 * It leaves with a short fade, so two scenes never show at once for longer than
 * that.
 */
const ENTER = 14;
const LEAVE = 8;

export const Shell = ({
  scene,
  children,
}: {
  scene: SceneName;
  children: ReactNode;
}) => (
  <Sequence
    from={sceneFrom(scene)}
    durationInFrames={sceneLength(scene)}
    name={scene}
    layout="none"
  >
    <Fade length={sceneLength(scene)}>{children}</Fade>
  </Sequence>
);

const Fade = ({
  length,
  children,
}: {
  length: number;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const entering = progress(frame, 0, ENTER, ENTRANCE);
  const leaving = progress(frame, length - LEAVE, LEAVE, ENTRANCE);

  return (
    <AbsoluteFill
      style={{
        opacity: entering * (1 - leaving),
        transform: `translateY(${lerp(18, 0, entering)}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
