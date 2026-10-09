import type { FloatingPosition } from "@mantine/core";
import type { TFunction } from "i18next";
import type { en } from "@/locales/en";
import type { EditorPane } from "@/features/editor/tourPane";
import type { TourName } from "./seen";

/**
 * What the tour points at, and what it says.
 *
 * Chosen for what a new user would otherwise miss rather than for what is
 * obvious. "This is the list of your resumes" earns nobody anything; that the
 * backup in Settings is the only copy of a local-first document is the sentence
 * this app most needs someone to read before they need it.
 *
 * A step's `id` is matched against the `data-tour` attribute of an element
 * mounted somewhere in the document (see `tourSelector`), so every id here has
 * exactly one anchor in the tree, and a step whose anchor is not mounted would
 * darken the screen and point at nothing. That is why there are two tours rather
 * than one crossing between the library and the editor: each tour's anchors are
 * all on the route it runs on.
 */

export const TOUR_TARGET_IDS = {
  newResume: "tour-new-resume",
  assets: "tour-assets",
  settings: "tour-settings",
  appMenu: "tour-app-menu",
  code: "tour-code",
  guide: "tour-guide",
  paper: "tour-paper",
  paperTitlebar: "tour-paper-titlebar",
  inspector: "tour-inspector",
  history: "tour-history",
  /**
   * The tab strip's three buttons, used instead of the three panes above when
   * the editor is one pane at a time.
   *
   * A separate anchor rather than a moved one, because the anchor and the step
   * are the same decision. A pane that fills the viewport cannot have a popover
   * beside it ("below" a target taller than the screen is off the bottom, and
   * shift only rescues the cross axis), while the tab that opens that pane is
   * a 30px button with a card's worth of room underneath it. It is also the
   * more honest thing to point at on a screen where the pane is a tab.
   */
  codeTab: "tour-code-tab",
  paperTab: "tour-paper-tab",
  styleTab: "tour-style-tab",
} as const;

/**
 * The selector `Tour.Step` takes for an anchor.
 *
 * A selector and not a ref, which is the point: the anchors are spread across a
 * dozen components, and a selector is resolved again when its element mounts
 * later, which is what a pane behind a tab does once the tour has asked for it.
 */
export const tourSelector = (id: string): string => `[data-tour="${id}"]`;

/**
 * Which side of the anchor the card goes.
 *
 * `bottom` is right for a button or a sidebar row, and wrong for a pane: three
 * of the editor's anchors are full-height columns, and "below" a target taller
 * than the viewport is off the bottom of the screen, which `shift` cannot
 * rescue, because it only moves along the cross axis. Beside a tall target the
 * card is centred on it instead, which is on screen by construction.
 */
const stepPosition = (id: string): FloatingPosition => {
  if (id === TOUR_TARGET_IDS.code || id === TOUR_TARGET_IDS.paper) {
    return "right";
  }

  return id === TOUR_TARGET_IDS.inspector ? "left" : "bottom";
};

/**
 * The steps whose anchor is a row in the sidebar.
 *
 * Where the sidebar is permanent this means nothing. Where it is an overlay (
 * a phone, a narrow tablet) those rows are translated off screen, so the tour
 * would dim the app and point at nothing, with no way forward. `AppTour` opens
 * the drawer for exactly these.
 */
export const SIDEBAR_STEP_IDS: ReadonlySet<string> = new Set([
  TOUR_TARGET_IDS.assets,
  TOUR_TARGET_IDS.settings,
]);

/**
 * Which editor pane each step needs open, where only one can be.
 *
 * Two kinds of entry. The three tab steps name the pane their tab opens, so the
 * pane behind the card is the one the card is describing. The other two name the
 * pane they are inside: the guide button lives in the code pane's tab strip and
 * the export controls in the paper's titlebar, and `keepMounted={false}` means
 * an inactive pane is not in the document at all, so without this the tour
 * would point at nothing. The history step is in the app bar and needs no pane.
 */
export const EDITOR_STEP_PANES: Readonly<Record<string, EditorPane>> = {
  [TOUR_TARGET_IDS.codeTab]: "code",
  [TOUR_TARGET_IDS.guide]: "code",
  [TOUR_TARGET_IDS.paperTab]: "paper",
  [TOUR_TARGET_IDS.paperTitlebar]: "paper",
  [TOUR_TARGET_IDS.styleTab]: "style",
};

/**
 * What each tour is made of: a target to point at and the key its words are
 * filed under in the `onboarding` messages. The sentence about a target is not
 * here, because it is in the language the interface is in.
 */
interface StepDefinition<TKey extends string> {
  id: string;
  key: TKey;
}

const LIBRARY_STEPS: Array<
  StepDefinition<keyof (typeof en)["onboarding"]["library"]>
> = [
  { id: TOUR_TARGET_IDS.newResume, key: "newResume" },
  { id: TOUR_TARGET_IDS.assets, key: "assets" },
  { id: TOUR_TARGET_IDS.settings, key: "settings" },
  { id: TOUR_TARGET_IDS.appMenu, key: "appMenu" },
];

type EditorKey = keyof (typeof en)["onboarding"]["editor"];

const EDITOR_STEPS: Array<StepDefinition<EditorKey>> = [
  { id: TOUR_TARGET_IDS.code, key: "code" },
  { id: TOUR_TARGET_IDS.guide, key: "guide" },
  { id: TOUR_TARGET_IDS.paper, key: "paper" },
  { id: TOUR_TARGET_IDS.paperTitlebar, key: "paperTitlebar" },
  { id: TOUR_TARGET_IDS.inspector, key: "inspector" },
  { id: TOUR_TARGET_IDS.history, key: "history" },
];

/**
 * The pane anchors, swapped for the tab that opens each pane.
 *
 * The copy is unchanged: what the step says about the code pane is true whether
 * the reader is looking at a column or at a tab, and writing it twice would
 * mean two things to keep in step. Only where the card points moves.
 */
const NARROW_EDITOR_ANCHORS: Readonly<Record<string, string>> = {
  [TOUR_TARGET_IDS.code]: TOUR_TARGET_IDS.codeTab,
  [TOUR_TARGET_IDS.paper]: TOUR_TARGET_IDS.paperTab,
  [TOUR_TARGET_IDS.inspector]: TOUR_TARGET_IDS.styleTab,
};

const NARROW_EDITOR_STEPS: Array<StepDefinition<EditorKey>> = EDITOR_STEPS.map(
  (step) => {
    const anchor = NARROW_EDITOR_ANCHORS[step.id];

    return anchor === undefined ? step : { ...step, id: anchor };
  },
);

/** One step as the tour draws it: the anchor, the card's words and its side. */
export interface TourStepContent {
  id: string;
  title: string;
  content: string;
  position: FloatingPosition;
}

export const tourSteps = (
  name: TourName,
  t: TFunction<"onboarding">,
  /**
   * Whether the editor is showing all three panes. False on a screen where it
   * is one pane behind a tab strip, which is what decides where the editor
   * tour's steps point. Irrelevant to the library tour.
   */
  options: { wideEditor: boolean } = { wideEditor: true },
): Array<TourStepContent> => {
  if (name === "library") {
    return LIBRARY_STEPS.map(({ id, key }) => ({
      id,
      title: t(`library.${key}.title`),
      content: t(`library.${key}.content`),
      position: stepPosition(id),
    }));
  }

  // The words are filed under the step's own key, whichever anchor it points at
  // on a narrow screen, so one sentence serves both layouts.
  return (options.wideEditor ? EDITOR_STEPS : NARROW_EDITOR_STEPS).map(
    ({ id, key }) => ({
      id,
      title: t(`editor.${key}.title`),
      content: t(`editor.${key}.content`),
      position: stepPosition(id),
    }),
  );
};
