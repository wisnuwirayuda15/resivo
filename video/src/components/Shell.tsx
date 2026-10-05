import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import { ENTRANCE, lerp, progress, STANDARD } from "../lib/motion";
import { sceneFrom, sceneLength } from "../timeline";

import type { SceneName } from "../timeline";
import type { ReactNode } from "react";

/**
 * One scene on the timeline.
 *
 * A scene starts on the first frame of a bar, which is where the music changes
 * and where `Transitions` has the frame fully covered. The scene comes up as the
 * cover opens: from below and a little large, over 22 frames, which is slower
 * than the panel so the content is still settling when the new scene is first
 * seen. It leaves the same way in reverse, pulling back and up under the panel
 * as it closes. The motion is deliberately big: a 12 pixel rise was the part
 * that read as nothing.
 */
const ENTER = 22;
const LEAVE = 14;

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
    <Motion length={sceneLength(scene)}>{children}</Motion>
  </Sequence>
);

const Motion = ({
  length,
  children,
}: {
  length: number;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const entering = progress(frame, 0, ENTER, ENTRANCE);
  const leaving = progress(frame, length - LEAVE, LEAVE, STANDARD);
  const shown = progress(frame, 0, 10, STANDARD);

  return (
    <AbsoluteFill
      style={{
        opacity: shown * (1 - leaving * 0.6),
        transform: `translateY(${lerp(110, 0, entering) - leaving * 70}px) scale(${
          lerp(0.93, 1, entering) - leaving * 0.05
        })`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
