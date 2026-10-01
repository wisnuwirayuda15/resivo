import { useCallback, useState } from "react";
import { Splitter, Tabs } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";

import { Icon } from "@/features/icons/IconRenderer";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { useTourPane } from "./tourPane";
import { cn } from "@/lib/utils";
import { PreviewPane } from "@/features/preview/PreviewPane";
import { StyleInspector } from "@/features/style/StyleInspector";
import { applyMarkdown } from "@/features/markdown/index";
import { patchDesign, setCustomCss } from "@/features/editor/mutations";

import { readPaneSizes, writePaneSizes } from "./panels";
import { CodePane } from "./CodePane";

import type { EditorPane } from "./tourPane";
import type { PaneSize } from "./panels";
import type { Recipe } from "./mutations";
import type { ParseWarning } from "@/features/markdown/index";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * The editor's three panels: code, preview, style.
 *
 * The code pane and the inspector are fixed `px` panes and the preview is the
 * flexible one, which is what makes widening the window widen the paper rather
 * than the controls beside it. None of the three can collapse to nothing: a pane
 * you cannot see is a pane you cannot drag back.
 *
 * Below `WIDE` the three become one, chosen by a tab strip. That is not a
 * preference: the minimums below add up to 888px of panes, plus two handles and
 * a 232px sidebar, so three panes need a 1122px viewport before anything is
 * even usable, and there was no fallback at all, so on a phone the editor
 * simply overflowed sideways.
 */

const PANE_COUNT = 3;

/**
 * The breakpoint, and why it is this one.
 *
 * 1122px is the measured floor; Mantine's `lg` is the nearest token above it,
 * and rounding up rather than down means the three-pane layout is never offered
 * at a width where it is already cramped.
 */
const WIDE = "(min-width: 1200px)";

/** The design system's widths for the two side panels. */
/**
 * 400 rather than the design system's 420, by 20px of arithmetic.
 *
 * At the narrowest width that offers three panes, the sidebar, the code pane and
 * the inspector are all fixed, so the preview gets whatever is left:
 * 1200 − 232 − 420 − 288 − 2 handles = 258px. That is not enough for the
 * preview's own control row, which was clipped there. Twenty pixels off this
 * gives it 278 and the row fits.
 *
 * It does not make the preview reach its declared 340px minimum at that width,
 * `Splitter` applies a pane's minimum while dragging, not when handing out the
 * space left over at mount. That is worth knowing and is not this constant's job
 * to fix.
 */
const CODE_DEFAULT = "400px";
const INSPECTOR_DEFAULT = "288px";

const DEFAULT_SIZES: Array<PaneSize> = [CODE_DEFAULT, 100, INSPECTOR_DEFAULT];

interface EditorLayoutProps {
  document: ResumeDocument;
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void;
  replace: (document: ResumeDocument, options?: { coalesce?: string }) => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  document,
  apply,
  replace,
}) => {
  /**
   * Read once, lazily, rather than in an effect. This only ever mounts inside a
   * client-only boundary, so `localStorage` is there, and restoring in an
   * effect would show the default layout for a frame and then jump.
   */
  const { t } = useTranslation("editor");
  const [sizes, setSizes] = useState<Array<PaneSize>>(
    () => readPaneSizes(PANE_COUNT) ?? DEFAULT_SIZES,
  );
  const [warnings, setWarnings] = useState<Array<ParseWarning>>([]);

  /** True only between pointerdown and pointerup on a splitter handle. */
  const [resizing, setResizing] = useState(false);

  /**
   * The tab, where there is only one pane.
   *
   * The paper is the default because the document is the point; the other two
   * are things done to it.
   */
  const [pane, setPane] = useState<EditorPane>("paper");

  /**
   * A pane the tour is asking for, which wins while it is asking.
   *
   * Not written into `pane`: the tour borrows the pane for the length of a
   * step and then stops asking, and the user's own choice is still underneath
   * when it does. Writing through would have the tour quietly reset the tab
   * someone had picked before it started.
   */
  const requestedPane = useTourPane((state) => state.requested);
  const activePane = requestedPane ?? pane;

  /**
   * Read during the first render rather than in an effect. This only mounts
   * inside a client-only boundary, so `matchMedia` is there, and deciding in
   * an effect would paint the wrong layout for a frame, which on a narrow screen
   * means a horizontal overflow appearing and vanishing.
   */
  const wide = useMediaQuery(WIDE, true, { getInitialValueInEffect: false });

  /**
   * Parsing lives here because this is what owns the store.
   *
   * Every edit from the text pane is one `replace` under a single coalesce key,
   * so a sentence typed in the editor collapses to one undo step rather than
   * one per debounce window, the same treatment the style panel's sliders get.
   */
  const handleSourceChange = useCallback(
    (source: string) => {
      const result = applyMarkdown(document, source);

      setWarnings(result.warnings);
      replace(result.document, { coalesce: "markdown" });
    },
    [document, replace],
  );

  /**
   * Custom CSS is stored verbatim; the preview sanitizes it on the way out. One
   * coalesce key, so a stylesheet typed in one sitting is one undo step.
   */
  const handleCustomCss = useCallback(
    (css: string) => apply(setCustomCss(css), { coalesce: "customCss" }),
    [apply],
  );

  const code = (
    <CodePane
      className="h-full"
      document={document}
      onCustomCssChange={handleCustomCss}
      onSourceChange={handleSourceChange}
      warnings={warnings}
    />
  );

  const preview = (
    <PreviewPane
      apply={apply}
      className="h-full"
      document={document}
      onPaperSizeChange={(size) => apply(patchDesign({ paper: { size } }))}
      // The file name an export is given. A letter is named for being one, so
      // the two documents of one person do not both download as their name.
      title={
        document.kind === "coverLetter"
          ? t("export.letterFile", { name: document.meta.fullName })
          : document.meta.fullName
      }
    />
  );

  const inspector = (
    <StyleInspector apply={apply} className="h-full" document={document} />
  );

  if (!wide) {
    return (
      /**
       * One pane at a time.
       *
       * `keepMounted={false}` is load-bearing rather than an optimisation: an
       * inactive Mantine tab panel is `display: none`, so a preview left
       * mounted in one would measure its paper at zero width and paginate
       * against nonsense. Unmounting costs a re-pagination on each switch,
       * which is the right price for a paper that is always measured at the
       * width it is drawn at.
       *
       * Controlled, because the onboarding tour drives it: below this
       * breakpoint four of its six steps are inside a pane, and a pane that is
       * not the active tab is not in the document for the tour to point at.
       */
      <Tabs
        className="flex h-full min-h-0 flex-col"
        keepMounted={false}
        onChange={(next) => {
          // Narrowed rather than cast: the three values are the tabs' own, and
          // a cast here would keep compiling if a fourth were ever added.
          if (next === "code" || next === "paper" || next === "style") {
            setPane(next);
          }
        }}
        value={activePane}
      >
        <Tabs.List
          aria-label={t("panes.label")}
          className="h-titlebar border-line-soft bg-surface flex-none border-b px-1"
        >
          {/* The tour points at these rather than at the panes they open, and
              the anchors live here rather than beside the pane ones so that
              exactly one of the two is in the document at a time. */}
          <OnboardingTour.Target id={TOUR_TARGET_IDS.codeTab}>
            <Tabs.Tab
              leftSection={<Icon name="markdown-logo" size={13} />}
              value="code"
            >
              {t("panes.code")}
            </Tabs.Tab>
          </OnboardingTour.Target>
          <OnboardingTour.Target id={TOUR_TARGET_IDS.paperTab}>
            <Tabs.Tab
              leftSection={<Icon name="file-text" size={13} />}
              value="paper"
            >
              {t("panes.paper")}
            </Tabs.Tab>
          </OnboardingTour.Target>
          <OnboardingTour.Target id={TOUR_TARGET_IDS.styleTab}>
            <Tabs.Tab
              leftSection={<Icon name="palette" size={13} />}
              value="style"
            >
              {t("panes.style")}
            </Tabs.Tab>
          </OnboardingTour.Target>
        </Tabs.List>

        <Tabs.Panel className="min-h-0 flex-1" value="code">
          {code}
        </Tabs.Panel>
        <Tabs.Panel className="min-h-0 flex-1" value="paper">
          {preview}
        </Tabs.Panel>
        <Tabs.Panel className="min-h-0 flex-1" value="style">
          {inspector}
        </Tabs.Panel>
      </Tabs>
    );
  }

  return (
    <Splitter
      /**
       * The iframe stops taking the pointer while a handle is being dragged.
       *
       * A drag is tracked by listeners on *this* document, and a pointer over
       * the preview is a pointer over another one (the iframe's), so the moves
       * never arrived and the handle stuck the instant the cursor crossed into
       * the paper. Which is most of a drag, since the preview is the pane in the
       * middle. `pointer-events: none` for the duration hands those moves back
       * to the document doing the tracking; nothing inside the frame wants a
       * pointer while a pane is being resized anyway.
       */
      className={cn("h-full", resizing && "[&_iframe]:pointer-events-none")}
      lineSize={1}
      onResizeEnd={(_handle, next) => {
        setResizing(false);
        writePaneSizes(PANE_COUNT, next);
      }}
      onResizeStart={() => setResizing(true)}
      onSizeChange={setSizes}
      sizes={sizes}
    >
      <Splitter.Pane defaultSize={CODE_DEFAULT} max="60%" min="280px">
        {code}
      </Splitter.Pane>

      <Splitter.Pane defaultSize={100} min="340px">
        {preview}
      </Splitter.Pane>

      <Splitter.Pane defaultSize={INSPECTOR_DEFAULT} max="45%" min="268px">
        {inspector}
      </Splitter.Pane>
    </Splitter>
  );
};
