import { useCurrentFrame } from "remotion";

import { Caret } from "../components/Caret";
import { lerp, progress } from "../lib/motion";
import timeline from "../timeline.json";

/**
 * Bars 1 and 2. A sentence is typed, then the syntax it names falls into a
 * pile under it, the way the first reference film does with its tags.
 */
const HEADLINE = "Write your resume in Markdown.";
const ACCENT_FROM = HEADLINE.indexOf("Markdown");

const { type, chips } = timeline.scenes.intro.events;

/** Where each chip comes to rest, from the centre of the pile. */
const PILE: ReadonlyArray<{
  label: string;
  x: number;
  y: number;
  rotate: number;
  accent?: boolean;
}> = [
  { label: "# Heading", x: -470, y: 50, rotate: -2 },
  { label: "## Section", x: -190, y: 44, rotate: 1.5 },
  { label: "**bold**", x: 60, y: 56, rotate: -1 },
  { label: "[link](url)", x: 330, y: 46, rotate: 2 },
  {
    label: "::contact[ada@example.com]",
    x: -380,
    y: 170,
    rotate: 1,
    accent: true,
  },
  {
    label: ':::entry{title="Analyst"}',
    x: 250,
    y: 176,
    rotate: -1.5,
    accent: true,
  },
  { label: "- A bullet", x: -450, y: 296, rotate: -1 },
  { label: "*italic*", x: -180, y: 288, rotate: 2 },
  { label: "> a quote", x: 80, y: 300, rotate: -2 },
];

/** Frames a chip takes to land, and how far above its place it starts. */
const FALL = 22;
const DROP = 560;

export const Intro = () => {
  const frame = useCurrentFrame();
  const typed = Math.min(
    HEADLINE.length,
    Math.max(0, Math.floor((frame - type.from) / type.every) + 1),
  );
  const text = HEADLINE.slice(0, typed);
  const lead = text.slice(0, ACCENT_FROM);
  const accent = text.slice(ACCENT_FROM);

  return (
    <div className="v-stage v-intro">
      <h1 className="v-headline">
        {/* The whole sentence holds the width, hidden, so the typed text starts
            at a fixed edge and does not re-centre with every letter. */}
        <span className="v-ghost" aria-hidden>
          {HEADLINE}
        </span>
        <span className="v-typed">
          {lead}
          <span className="v-accent">{accent}</span>
          <Caret />
        </span>
      </h1>
      <div className="v-pile">
        {PILE.map((chip, index) => {
          const start = (chips[index] ?? 0) - FALL;
          const fall = progress(frame, start, FALL);
          const visible = progress(frame, start, 6);

          return (
            <span
              key={chip.label}
              className="v-chip"
              data-accent={chip.accent === true}
              style={{
                opacity: visible,
                transform: `translate(calc(-50% + ${chip.x}px), calc(-50% + ${lerp(
                  chip.y - DROP,
                  chip.y,
                  fall,
                )}px)) rotate(${lerp(chip.rotate * 4, chip.rotate, fall)}deg)`,
              }}
            >
              {chip.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
