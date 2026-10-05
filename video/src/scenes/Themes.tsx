import { Moon, Sun } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";

import { Backdrop } from "../components/Backdrop";
import { Cursor, isPressed } from "../components/Cursor";
import { MarkdownPane } from "../components/MarkdownPane";
import { Paper } from "../components/Paper";
import { Window } from "../components/Window";
import { lerp, progress, STANDARD } from "../lib/motion";
import { SOURCE } from "../lib/typing";
import { createSampleDocument } from "@/features/resume/sample";
import { sceneFrom } from "../timeline";
import timeline from "../timeline.json";

import type { Waypoint } from "../components/Cursor";

/**
 * Bars 9 to 11. The window is shown in the light theme, the pointer presses the
 * moon, and a circle of the dark theme opens from the button across the whole
 * frame: the title, the backdrop and the window change together, and the paper
 * does not, because the paper never follows the theme.
 *
 * The dark layer is a second copy of the same scene under
 * `data-mantine-color-scheme="dark"`. The app's `scheme.css` keys every
 * semantic colour off that attribute on any element, which is what lets one
 * subtree flip inside a document that is otherwise light.
 */
const { clicks, flips } = timeline.scenes.themes.events;
const CLICK = clicks[0] ?? 0;
const FLIP = flips[0] ?? 0;

/** The page position of the moon in the window's title strip. */
const MOON = { x: 1691, y: 217 };

const PATH: ReadonlyArray<Waypoint> = [
  { frame: 24, x: 1250, y: 760 },
  { frame: CLICK - 8, ...MOON },
  { frame: CLICK + 12, ...MOON },
  { frame: CLICK + 70, x: 1180, y: 880 },
];

/** The first lines of the example, which is what the pane has room for. */
const EXCERPT = SOURCE.split("\n").slice(0, 17).join("\n");

const document = createSampleDocument();

const Toggle = ({ dark, pressed }: { dark: boolean; pressed: boolean }) => (
  <div className="v-toggle">
    <span className="v-toggle-side" data-active={!dark}>
      <Sun size={26} weight="bold" />
    </span>
    <span className="v-toggle-side" data-active={dark} data-pressed={pressed}>
      <Moon size={26} weight="bold" />
    </span>
  </div>
);

const Content = ({ dark, frame }: { dark: boolean; frame: number }) => {
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
        Light or dark. <span className="v-accent">The paper stays paper.</span>
      </h2>
      <Window
        title="resume.md"
        className="v-write-window"
        actions={<Toggle dark={dark} pressed={isPressed(frame, CLICK)} />}
      >
        <div className="v-split">
          <MarkdownPane text={EXCERPT} top />
          <div className="v-canvas">
            <Paper document={document} scale={0.92} />
          </div>
        </div>
      </Window>
    </div>
  );
};

export const Themes = () => {
  const frame = useCurrentFrame();
  const reveal = progress(frame, FLIP, 34, STANDARD);
  // Far enough to cover the corner furthest from the moon.
  const radius = lerp(0, 2100, reveal);

  return (
    <>
      <Content dark={false} frame={frame} />
      <div
        className="v-layer"
        data-mantine-color-scheme="dark"
        style={{
          clipPath: `circle(${radius}px at ${MOON.x}px ${MOON.y}px)`,
          visibility: reveal === 0 ? "hidden" : "visible",
        }}
      >
        <Backdrop from={sceneFrom("themes")}>
          <Content dark frame={frame} />
        </Backdrop>
      </div>
      <Cursor path={PATH} clicks={clicks} />
    </>
  );
};
