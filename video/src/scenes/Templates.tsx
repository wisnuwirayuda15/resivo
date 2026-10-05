import { useCurrentFrame } from "remotion";

import { Cursor } from "../components/Cursor";
import { Paper } from "../components/Paper";
import { Window } from "../components/Window";
import { lerp, progress, STANDARD } from "../lib/motion";
import { createSampleDocument } from "@/features/resume/sample";
import { templateDefaults } from "@/features/templates/defaults";
import { templates } from "@/locales/en/templates";
import timeline from "../timeline.json";

import type { Waypoint } from "../components/Cursor";
import type { TemplateId } from "@/features/resume/model/document";

/**
 * Bars 5 and 6. One document, drawn by each template in turn.
 *
 * The paper stays where it was in the scene before, on the right, and the list
 * of templates takes the place of the editor, so the cut reads as the same
 * window changing what it shows. The pointer picks a card a few frames before
 * the paper changes, which is the order cause and effect happen in.
 */
const IDS: ReadonlyArray<TemplateId> = [
  "classic",
  "modern",
  "technical",
  "editorial",
  "compact",
  "profile",
  "bold",
];

/** The face each template sets its headings in, for the "Aa" on its card. */
const FACE: Record<TemplateId, "serif" | "sans" | "mono"> = {
  classic: "serif",
  modern: "sans",
  technical: "mono",
  editorial: "serif",
  compact: "sans",
  profile: "sans",
  bold: "sans",
};

const DOCUMENTS = Object.fromEntries(
  IDS.map((id) => [id, createSampleDocument(id)]),
) as Record<TemplateId, ReturnType<typeof createSampleDocument>>;

const { clicks, swaps } = timeline.scenes.templates.events;

/** The page position of a card's centre, from the window's geometry. */
const CARD_X = 700;
const rowY = (index: number): number => 318 + index * 98;

const PATH: ReadonlyArray<Waypoint> = [
  { frame: 0, x: 1320, y: 760 },
  ...clicks.flatMap((click, index) => [
    { frame: click - 5, x: CARD_X, y: rowY(index + 1) },
    { frame: click + 6, x: CARD_X, y: rowY(index + 1) },
  ]),
];

export const Templates = () => {
  const frame = useCurrentFrame();
  const index = swaps.filter((swap) => frame >= swap).length;
  const swapped = swaps[index - 1] ?? 0;
  const current = IDS[index] ?? "classic";
  const previous = index === 0 ? undefined : IDS[index - 1];
  const fade = index === 0 ? 1 : progress(frame, swapped, 8, STANDARD);
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
        Seven templates. <span className="v-accent">One document.</span>
      </h2>
      <Window title="Style  /  Template" className="v-write-window">
        <div className="v-split">
          <div className="v-tpl-list">
            {IDS.map((id, row) => (
              <div key={id} className="v-tpl" data-active={row === index}>
                <span
                  className="v-swatch"
                  style={{ background: templateDefaults(id).colors.accent }}
                />
                <span className="v-tpl-name">{templates[id].name}</span>
                <span className="v-tpl-aa" data-face={FACE[id]}>
                  Aa
                </span>
              </div>
            ))}
          </div>
          <div className="v-canvas">
            <div className="v-stack">
              {previous !== undefined && fade < 1 ? (
                <div className="v-stack-layer">
                  <Paper document={DOCUMENTS[previous]} scale={0.92} />
                </div>
              ) : null}
              <div className="v-stack-layer" style={{ opacity: fade }}>
                <Paper document={DOCUMENTS[current]} scale={0.92} />
              </div>
            </div>
          </div>
        </div>
      </Window>
      <Cursor path={PATH} clicks={clicks} />
    </div>
  );
};
