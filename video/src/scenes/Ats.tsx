import { CheckCircle } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";

import { Button } from "../components/Button";
import { Cursor, isPressed } from "../components/Cursor";
import { Paper } from "../components/Paper";
import { Window } from "../components/Window";
import { AFTER_ALL, AFTER_ONE, BEFORE, ISSUES, isBodySize } from "../lib/ats";
import { lerp, progress } from "../lib/motion";
import { tAts } from "../lib/t";
import { describeIssue } from "@/features/ats/describe";
import timeline from "../timeline.json";

import type { Waypoint } from "../components/Cursor";
import type { AtsIssue } from "@/features/ats/types";

/**
 * Bars 7 and 8. The panel lists what is wrong with the page, one fix is taken
 * on its own so the page can be seen to change, and the rest go together.
 *
 * The words are the app's (`describeIssue` over the real rules), the findings
 * are the real rules' findings on a resume made to have some, and the fixes are
 * the app's recipes, run on the document the paper draws.
 */
const { chips, clicks } = timeline.scenes.ats.events;
const FIX_ONE = clicks[0] ?? 0;
const FIX_ALL = clicks[1] ?? 0;

/** Pitch of a card in the list, and where the first one starts on the page. */
const STEP = 142;

const removedAt = (issue: AtsIssue): number =>
  isBodySize(issue) ? FIX_ONE : FIX_ALL;

const bodySizeSlot = ISSUES.findIndex(isBodySize);

/** The page positions of the two buttons the pointer goes to. */
const ONE = { x: 745, y: 358 + bodySizeSlot * STEP + 64 };
const ALL = { x: 788, y: 306 };

const PATH: ReadonlyArray<Waypoint> = [
  { frame: 10, x: 1500, y: 700 },
  { frame: FIX_ONE - 8, ...ONE },
  { frame: FIX_ONE + 10, ...ONE },
  { frame: FIX_ALL - 8, ...ALL },
  { frame: FIX_ALL + 12, ...ALL },
  { frame: FIX_ALL + 54, x: 1180, y: 820 },
];

export const Ats = () => {
  const frame = useCurrentFrame();
  const document =
    frame >= FIX_ALL ? AFTER_ALL : frame >= FIX_ONE ? AFTER_ONE : BEFORE;
  const remaining =
    frame >= FIX_ALL ? 0 : frame >= FIX_ONE ? ISSUES.length - 1 : ISSUES.length;
  const rise = progress(frame, 0, 24);
  const done = progress(frame, FIX_ALL + 8, 18);

  return (
    <div className="v-stage v-write">
      <h2
        className="v-title"
        style={{
          opacity: rise,
          transform: `translateY(${lerp(20, 0, rise)}px)`,
        }}
      >
        Catch problems{" "}
        <span className="v-accent">before a recruiter does.</span>
      </h2>
      <Window title="Inspector  /  ATS" className="v-write-window">
        <div className="v-split">
          <div className="v-ats">
            <div className="v-ats-head">
              <span className="v-ats-count">
                {remaining === 0
                  ? ""
                  : tAts("tab.warnings", { count: remaining })}
              </span>
              {remaining === 0 ? null : (
                <Button pressed={isPressed(frame, FIX_ALL)}>
                  {tAts("tab.fixAll", { count: remaining })}
                </Button>
              )}
            </div>
            <div className="v-ats-list">
              {ISSUES.map((issue, index) => {
                const text = describeIssue(tAts, issue);
                const gone = progress(frame, removedAt(issue), 12);
                const enter = progress(frame, (chips[index] ?? 0) - 12, 16);
                const slot = ISSUES.slice(0, index).reduce(
                  (total, other) =>
                    total + 1 - progress(frame, removedAt(other) + 2, 14),
                  0,
                );

                return (
                  <div
                    key={issue.id}
                    className="v-issue"
                    style={{
                      opacity: enter * (1 - gone),
                      transform: `translate(${lerp(60, 0, enter)}px, ${
                        slot * STEP
                      }px) scale(${1 - gone * 0.04})`,
                    }}
                  >
                    <div className="v-issue-main">
                      <span className="v-pill" data-severity={issue.severity}>
                        {tAts(`tab.severity.${issue.severity}`)}
                      </span>
                      <div className="v-issue-message">{text.message}</div>
                      <div className="v-issue-where">{text.where}</div>
                    </div>
                    <Button
                      pressed={isBodySize(issue) && isPressed(frame, FIX_ONE)}
                    >
                      {text.fix}
                    </Button>
                  </div>
                );
              })}
              <div
                className="v-ats-clean"
                style={{
                  opacity: done,
                  transform: `scale(${lerp(0.92, 1, done)})`,
                }}
              >
                <CheckCircle size={112} weight="fill" color="var(--success)" />
                <div className="v-ats-clean-title">{tAts("tab.clean")}</div>
                <div className="v-ats-clean-note">{tAts("tab.disclaimer")}</div>
              </div>
            </div>
          </div>
          <div className="v-canvas">
            <Paper document={document} scale={0.92} />
          </div>
        </div>
      </Window>
      <Cursor path={PATH} clicks={clicks} />
    </div>
  );
};
