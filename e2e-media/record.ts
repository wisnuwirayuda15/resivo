import { copyFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect } from "@playwright/test";

import {
  createResume,
  expectPaperReady,
  openEmptyApp,
  paper,
} from "../e2e/app";

import {
  Camera,
  SOURCE,
  centerOf,
  encodeClip,
  installCursor,
  moveCursor,
  posterFrom,
  publicMedia,
  pulseCursor,
} from "./clip";

import type { Browser, Locator, Page, TestInfo } from "@playwright/test";

/**
 * The part of a docs clip that is the same every time: build the document where
 * nobody is watching, open it in a recording context, set the stage, run the
 * story, and encode what was kept.
 *
 * A clip's spec is then only its story, a function of the page and the camera.
 */

/** How long the raw recording runs before the first frame the app can be
 * judged by: Playwright starts a video when the page is made, and a few frames
 * of it are the browser's own blank page. */
const LEAD_IN = 0.15;

/** A clip over this is too heavy for a page that does not preload it. */
const MAX_BYTES = 2_000_000;

export interface Scene {
  page: Page;
  camera: Camera;
  /** The centre of the whole window: the camera's resting place. */
  wide: { x: number; y: number };
}

/** Glides the pointer to a target, pulses, and clicks it. */
export const press = async (page: Page, target: Locator): Promise<void> => {
  const { x, y } = await centerOf(target);

  await moveCursor(page, x, y);
  await pulseCursor(page);
  await target.click();
};

/** `pointerDrag` from the e2e helpers, with the on-screen pointer following. */
export const dragWithCursor = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> => {
  const cdp = await page.context().newCDPSession(page);
  const send = (
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    x: number,
    y: number,
    buttons: number,
  ) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      buttons,
      button: buttons === 0 && type === "mouseMoved" ? "none" : "left",
      clickCount: type === "mouseMoved" ? 0 : 1,
    });

  await moveCursor(page, from.x, from.y, 320);
  await send("mouseMoved", from.x, from.y, 0);
  await send("mousePressed", from.x, from.y, 1);
  await pulseCursor(page);

  const steps = 26;

  for (let step = 1; step <= steps; step += 1) {
    const x = from.x + ((to.x - from.x) * step) / steps;
    const y = from.y + ((to.y - from.y) * step) / steps;

    await send("mouseMoved", x, y, 1);
    await moveCursor(page, x, y, 0);
    await page.waitForTimeout(14);
  }

  // Held over the target, so the line that says where the drop will land is on
  // screen long enough to read.
  await page.waitForTimeout(450);
  await send("mouseReleased", to.x, to.y, 0);
  await cdp.detach();
};

/** An item on the paper: a section heading or a block, found by its text. */
export const item = (
  page: Page,
  kind: "section" | "block",
  text: string,
): Locator =>
  paper(page)
    .locator(`[data-paged] .rp-item--${kind}`)
    .filter({ hasText: text })
    .first();

/**
 * Scrolls whatever scrolls, smoothly, so a target is in the middle of its pane.
 *
 * A jump would cut from one place to another; a scroll is what a person does,
 * and it keeps the viewer oriented in the document or the panel.
 */
export const scrollTo = async (page: Page, target: Locator): Promise<void> => {
  await target.evaluate((element) =>
    element.scrollIntoView({ behavior: "smooth", block: "center" }),
  );
  await page.waitForTimeout(800);
};

/**
 * The camera on the paper: across its sheet, and `down` pixels below the top of
 * the pane. Taken from the preview frame and not from an item on the paper,
 * whose own box is not where the page is.
 */
export const lookAtPaper = async (
  page: Page,
  camera: Camera,
  options: { zoom?: number; down?: number; over?: number } = {},
): Promise<void> => {
  const frame = await page.locator("iframe").boundingBox();

  if (frame === null) {
    throw new Error("the preview has no box");
  }

  await camera.look(
    page,
    frame.x + frame.width / 2,
    frame.y + (options.down ?? 330),
    options.zoom ?? 1.3,
    options.over,
  );
};

/** Switches the preview to Visual mode, with the pointer. */
export const goVisual = (page: Page): Promise<void> =>
  press(page, page.locator("label").filter({ hasText: /^Visual$/ }));

/** The keys that mark each onboarding tour as seen (`openEmptyApp` sets them). */
const TOUR_KEYS = ["resivo.onboarding.library", "resivo.onboarding.editor"];

/** Waits until the autosave has written what was just changed. */
const settled = async (page: Page): Promise<void> => {
  // "Saving" starts a moment after an edit, and "Saved" is also what a document
  // with no edit says, so without this pause the wait can pass before it begins.
  await page.waitForTimeout(800);
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(600);
};

/**
 * Records one clip.
 *
 * `script` returns the second, in the clip's own time, whose frame is the still
 * shown before it plays; without one the still is the first frame.
 */
export const recordClip = async (options: {
  browser: Browser;
  testInfo: TestInfo;
  /** The file name, without an extension, under `public/docs-media`. */
  name: string;
  /**
   * Where the clip opens.
   *
   * - `editor` (the default): a resume already made and open, for a story about
   *   using the editor.
   * - `library`: the library, with that resume in it, for a story that starts
   *   from a card.
   * - `empty-library`: the app with nothing in it, for the story of making the
   *   first resume.
   */
  opens?: "editor" | "library" | "empty-library";
  /** Start the resume from a blank page and not from the example. */
  blank?: boolean;
  /**
   * Gets the resume into the state the story starts from, in the editor and
   * before anything is recorded: a style changed, a section added. Whatever it
   * does is saved before the recording begins.
   */
  prepare?: (page: Page) => Promise<void>;
  /** Leave the onboarding tours on, for the clip that is about them. */
  tours?: boolean;
  script: (scene: Scene) => Promise<number | undefined>;
}): Promise<void> => {
  const { browser, testInfo, name } = options;
  const opens = options.opens ?? "editor";
  const tours = options.tours === true;

  mkdirSync(path.dirname(publicMedia("x")), { recursive: true });

  // 1. Build the document somewhere nobody is recording.
  const setupContext = await browser.newContext({ viewport: SOURCE });
  const setup = await setupContext.newPage();

  await openEmptyApp(setup);

  let editorUrl = "";

  if (opens !== "empty-library") {
    await createResume(setup, "Ada Lovelace", {
      start: options.blank === true ? "Blank page" : "Example resume",
    });

    editorUrl = setup.url();

    if (options.prepare !== undefined) {
      await options.prepare(setup);
      await settled(setup);
    }
  }

  if (opens === "library") {
    // Leaving the editor flushes the autosave, as it does for a person.
    await setup.getByRole("link", { name: "All resumes" }).click();
    await expect(
      setup.getByRole("button", { name: /^Actions for/ }).first(),
    ).toBeVisible();
  }

  if (tours) {
    await setup.evaluate((keys) => {
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    }, TOUR_KEYS);
  }

  const startUrl = opens === "editor" ? editorUrl : setup.url();
  const state = await setupContext.storageState({ indexedDB: true });

  await setupContext.close();

  // 2. Record the person using it.
  const context = await browser.newContext({
    viewport: SOURCE,
    storageState: state,
    // The raw file goes to the run's own output folder, which is ignored; only
    // the finished clip is saved into `public`.
    recordVideo: { dir: testInfo.outputDir, size: SOURCE },
  });
  await context.addInitScript(installCursor);

  // A video is per page and starts when the page is made. The first load of the
  // editor is the slow one, so it happens in a page whose recording is thrown
  // away, and the page that is kept opens on modules the browser already has.
  const warm = await context.newPage();

  if (opens === "empty-library") {
    await warm.goto(startUrl);

    // The editor is what is slow to load, and this story reaches it by making a
    // resume. So one is made here, and the database is deleted again (it is the
    // same one the recording will open) before the page that is kept begins. The
    // tours are marked seen for the length of it: an overlay would intercept the
    // clicks, and the flags are put back afterwards when the recording needs
    // them off.
    await warm.evaluate((keys) => {
      for (const key of keys) {
        localStorage.setItem(key, "1");
      }
    }, TOUR_KEYS);
    await warm.reload();
    await createResume(warm, "Warm up", { start: "Example resume" });
    await warm.evaluate(
      ([keys, restore]) => {
        if (restore) {
          for (const key of keys) {
            localStorage.removeItem(key);
          }
        }

        return new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase("resivo");

          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          // The page still holds a connection; closing it completes the delete.
          request.onblocked = () => resolve();
        });
      },
      [TOUR_KEYS, tours] as const,
    );
  } else {
    await warm.goto(editorUrl);
    await expectPaperReady(warm);
  }

  await warm.close();
  // The delete above completes once the closed page has let go of its connection.
  await new Promise((resolve) => setTimeout(resolve, 600));

  let clipStart = Date.now();
  const camera = new Camera(() => clipStart);

  const created = Date.now();
  const page = await context.newPage();

  await page.goto(startUrl);

  if (opens === "editor") {
    await expectPaperReady(page);
  } else if (opens === "library") {
    await expect(
      page.getByRole("button", { name: /^Actions for/ }).first(),
    ).toBeVisible();
  } else {
    await expect(page.getByText("No resumes yet").first()).toBeVisible();
  }

  // Set the stage before the clip begins: the sidebar folded away, so the panes
  // get its width and the paper is fitted larger. A step of app zoom on top of
  // that was tried and dropped: at 150% a page is taller than the window, the
  // drag has to cross a scroll, and the camera does the enlarging better anyway.
  // It happens in the part that is cut, being what a person does first and not
  // what the clip is about. A clip about the tours keeps the sidebar, which the
  // tour points at.
  if (!tours) {
    await page.getByRole("button", { name: "Toggle sidebar" }).click();
  }

  if (opens === "editor") {
    await expectPaperReady(page);
  }

  await page.waitForTimeout(1500);

  // The clip's first frame is the moment the stage is set.
  const trimFrom = (Date.now() - created) / 1000 - LEAD_IN;
  clipStart = Date.now() - LEAD_IN * 1000;

  const wide = { x: SOURCE.width / 2, y: SOURCE.height / 2 };

  camera.shots.push({ at: 0, ...wide, zoom: 1, over: 0.1 });
  await page.waitForTimeout(450);

  const posterAt = await options.script({ page, camera, wide });

  // Back to the whole window to finish on.
  await camera.look(page, wide.x, wide.y, 1, 0.7);
  await page.waitForTimeout(500);

  const length = camera.now();
  const video = page.video();

  await page.close();
  await context.close();

  const raw = path.join(testInfo.outputDir, "raw.webm");

  await video?.saveAs(raw);

  // Encoded into the run's folder first and then copied in, so the dev server's
  // file watcher never opens a file that is still being written (which on
  // Windows killed it with EBUSY).
  const clip = path.join(testInfo.outputDir, `${name}.webm`);
  const still = path.join(testInfo.outputDir, `${name}.jpg`);

  // Kept beside the raw file, so an encode setting can be tried again without
  // recording again.
  writeFileSync(
    path.join(testInfo.outputDir, "shots.json"),
    JSON.stringify({ from: trimFrom, length, shots: camera.shots }),
  );

  encodeClip({ raw, out: clip, from: trimFrom, length, shots: camera.shots });
  posterFrom(clip, posterAt ?? 0.2, still);

  copyFileSync(clip, publicMedia(`${name}.webm`));
  copyFileSync(still, publicMedia(`${name}.jpg`));

  const bytes = statSync(clip).size;

  console.log(
    `${name}.webm: ${(bytes / 1024).toFixed(0)} KB, ${length.toFixed(1)} s`,
  );
  expect(bytes).toBeLessThan(MAX_BYTES);
};
