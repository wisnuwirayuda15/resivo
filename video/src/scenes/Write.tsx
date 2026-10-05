import { Easing, interpolate, useCurrentFrame } from "remotion";

import { MarkdownPane } from "../components/MarkdownPane";
import { Paper } from "../components/Paper";
import { Window } from "../components/Window";
import { lerp, progress } from "../lib/motion";
import { documentAfter, SOURCE } from "../lib/typing";
import timeline from "../timeline.json";

/**
 * Bars 3 and 4. The example is typed into the editor and the paper fills as it
 * goes. The typing starts at a reading pace, so the first lines can be read,
 * and speeds up, so the rest is felt as a page forming and not as text.
 */
const { from, frames } = timeline.scenes.write.events.type;

export const Write = () => {
  const frame = useCurrentFrame();
  const amount = interpolate(frame, [from, from + frames], [0, 1], {
    easing: Easing.in(Easing.poly(2.1)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const text = SOURCE.slice(0, Math.round(amount * SOURCE.length));
  const complete = text.split("\n").length - 1;
  const rise = progress(frame, 0, 24);

  return (
    <div className="v-stage v-write">
      <h2
        className="v-title"
        style={{
          opacity: rise,
          transform: `translateY(${lerp(20, 0, rise)}px)`,
        }}
      >
        Markdown in. <span className="v-accent">The page out.</span>
      </h2>
      <Window title="resume.md" className="v-write-window">
        <div className="v-split">
          <MarkdownPane text={text} />
          <div className="v-canvas">
            <Paper document={documentAfter(complete)} scale={0.92} />
          </div>
        </div>
      </Window>
    </div>
  );
};
