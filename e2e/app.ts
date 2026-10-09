import { expect } from "@playwright/test";

import type { Locator, Page } from "@playwright/test";

/**
 * Shared moves for the end-to-end specs.
 *
 * Everything here is expressed the way a person would describe it ("make a
 * resume called X", "open the style panel"), so a spec reads as a workflow and
 * not as a list of selectors. When the markup moves, one of these breaks rather
 * than every test.
 *
 * Locators go through roles and accessible names wherever there is one. That is
 * not purity: a test that can only find a button by its class is a test that
 * passes while the button is unreachable to anyone using a screen reader.
 */

/** The Dexie database, from `src/database/db.ts`. */
const DB_NAME = "resivo";

/**
 * A 2x2 PNG, correct down to its CRCs.
 *
 * Written out rather than read from a fixture file so a spec has no dependency
 * on the working directory. It has to be a real image: upload validates by
 * handing the bytes to `createImageBitmap`, which is the browser's own decoder
 * and rejects a malformed chunk that a structural check would pass.
 */
export const PNG_2X2 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGM4IScnF3CCAUIBAB6kBHUNzDQ/AAAAAElFTkSuQmCC";

/**
 * Opens the app with an empty database.
 *
 * Deleting before the app loads matters: Dexie opens its connection on the first
 * query, and deleting a database with an open connection blocks until that
 * connection closes, which, in a page that is still running, is never.
 */
export const openEmptyApp = async (page: Page): Promise<void> => {
  // The library, not '/': that is the landing page now, and every spec here
  // is about the app behind it.
  await page.goto("/resumes");

  /**
   * Marked as a returning user, unless a spec asks otherwise.
   *
   * Every spec here starts from a deleted database (that is, as a brand-new
   * user), and the onboarding tour opens over the app for exactly those. It is
   * an overlay with a cutout, so it intercepts the clicks every other spec then
   * makes. `e2e/onboarding.spec.ts` is the one that opts back in.
   */
  await page.evaluate(() => {
    try {
      localStorage.setItem("resivo.onboarding.library", "1");
      localStorage.setItem("resivo.onboarding.editor", "1");
    } catch {
      // A browser that refuses storage would not show the tour either.
    }
  });

  await page.evaluate(
    (name) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error("could not delete database"));
        // Something still holds a connection. The reload below closes it, and
        // the delete completes then.
        request.onblocked = () => resolve();
      }),
    DB_NAME,
  );

  await page.reload();
  // The first spec of a run on a cold dev server waits for the app's chunks to
  // compile on the request, which outlasts the 5s an assertion gets by default.
  // Once they are compiled the shell is up in a fraction of a second.
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible({
    timeout: 20_000,
  });
};

/**
 * Picks one option of a Mantine `SegmentedControl`, by its visible label.
 *
 * The click goes to the label and not to the radio it names, which is the one
 * place in this file that does not go through a role. Mantine renders each
 * segment's input as a 0 by 0 box behind the label, so a click on the element
 * that carries the accessible name has no area to land on. The radio is still
 * what an assertion reads, because it is what holds the state.
 */
export const pickSegment = (
  scope: Locator | Page,
  label: string,
): Promise<void> => scope.getByText(label, { exact: true }).click();

/**
 * Creates a resume through the dialog, and lands in its editor.
 *
 * Blank unless a spec asks for the example. The dialog's own default is the
 * example resume, which is right for a person and wrong for a spec: every test
 * below writes its own document and would otherwise have to clear somebody
 * else's first. `starting.spec.ts` is where the default itself is checked.
 */
export const createResume = async (
  page: Page,
  title: string,
  options: { template?: string; start?: "Example resume" | "Blank page" } = {},
): Promise<void> => {
  /**
   * The app bar's, not the sidebar's and not the empty state's.
   *
   * Three buttons carry this name. The sidebar's is translated off screen below
   * the navbar's breakpoint, visible to a locator, unclickable to a pointer,
   * and the empty state's is gone the moment the library has anything in it.
   * The one in the bar is on screen at every width and whatever the library
   * holds.
   */
  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await expect(dialog).toBeVisible();

  if (options.template !== undefined) {
    await dialog.getByRole("button", { name: options.template }).click();
  }

  await pickSegment(dialog, options.start ?? "Blank page");

  await dialog.getByLabel("Name").fill(title);
  await dialog.getByRole("button", { name: "Create resume" }).click();

  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
  await expectPaperReady(page);
};

/**
 * The preview iframe, once it has painted a page.
 *
 * Pagination measures before it lays out, so the paper exists in the DOM a beat
 * before it has any pages in it. Waiting for a page box is what makes the rest
 * of a spec able to assume there is something to look at.
 */
export const paper = (page: Page) =>
  page.frameLocator("iframe").locator("body");

/**
 * Opens an item's menu: hover it, then click its grip. The chrome is two small
 * buttons in the left margin (a plus and a grip), and move, duplicate-by-menu and
 * delete live in what the grip opens.
 */
export const openItemMenu = async (item: Locator): Promise<void> => {
  await item.hover();
  await item.getByRole("button", { name: "Drag to move" }).click();
};

export const expectPaperReady = async (page: Page): Promise<void> => {
  await expect(paper(page).locator("[data-paged]").first()).toBeVisible({
    timeout: 30_000,
  });
};

/** The text on the rendered paper, with the measuring pass excluded. */
export const paperText = async (page: Page): Promise<string> =>
  paper(page).locator("[data-paged]").first().innerText();

/** Types into the Markdown pane, replacing whatever is in it. */
export const typeMarkdown = async (
  page: Page,
  source: string,
): Promise<void> => {
  const editor = page.locator(".monaco-editor").first();
  await expect(editor).toBeVisible();

  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");

  /**
   * The delay is load-bearing. Do not set it to zero.
   *
   * Monaco reads its hidden textarea on a schedule rather than per keystroke, and
   * CDP with no delay delivers keys faster than any human can, fast enough that
   * Monaco drops some. Measured on this app: at `delay: 0` a 60-character line
   * arrives as `#a Lo…Wrote thm.`, at 15ms and at 40ms it arrives intact. So a
   * zero delay does not test the app, it tests the editor's input queue.
   */
  await page.keyboard.type(source, { delay: 20 });
};

/** No-break space and middle dot, written as escapes so this file has no
 * characters in it that look like something they are not. */
const NBSP = String.fromCharCode(0x00a0);
const MIDDLE_DOT = String.fromCharCode(0x00b7);

/**
 * What the Markdown pane is showing.
 *
 * Read from the rendered lines and then normalized, because Monaco does not
 * render text as text: a space becomes a no-break space, and whitespace it
 * chooses to make visible becomes a middle dot. Both look exactly like a space
 * in a terminal, so a pattern written with ordinary spaces silently never
 * matches, which reads as "the pane did not update" when it did.
 */
export const markdownPaneText = async (page: Page): Promise<string> => {
  const lines = await page.evaluate(() =>
    [...document.querySelectorAll(".view-line")].map(
      (node) => (node as HTMLElement).innerText,
    ),
  );

  return lines.join("\n").replaceAll(NBSP, " ").replaceAll(MIDDLE_DOT, " ");
};

/**
 * Opens a named tab in the inspector on the right.
 *
 * Scoped to that tab strip by name, because up to three are on screen at once:
 * the editor's panes below the breakpoint, the code pane's files, and this one.
 * Two of them have a tab called "Style", and the code pane's is named after a
 * file, so `exact` alone was never going to be enough.
 */
export const openInspectorTab = async (
  page: Page,
  name: string,
): Promise<void> => {
  await page
    .getByRole("tablist", { name: "Inspector" })
    .getByRole("tab", { name, exact: true })
    .click();
};

/** A tab in the editor's own strip, which only exists below the breakpoint. */
export const openEditorPane = async (
  page: Page,
  name: string,
): Promise<void> => {
  await page
    .getByRole("tablist", { name: "Editor panes" })
    .getByRole("tab", { name, exact: true })
    .click();
};

/**
 * The dropdown that is open right now.
 *
 * Mantine leaves a closed dropdown in the DOM, so once two menus have been
 * opened a page-wide search for a menu item finds items in both. A submenu is
 * its own dropdown too, and opens after its parent, hence `last`.
 */
export const visibleMenu = (page: Page) =>
  page.locator('[role="menu"]:visible').last();

/**
 * Opens a resume card's action menu and returns it.
 *
 * The menu is returned rather than assumed, because Mantine leaves a closed
 * dropdown in the DOM: after two cards have had their menus opened, a page-wide
 * search for a menu item finds both. Everything a spec clicks has to be scoped
 * to the one that is open now.
 */
export const cardMenu = async (page: Page, title: string) => {
  await page.getByRole("button", { name: `Actions for ${title}` }).click();

  /**
   * Found by name, not by "the visible one".
   *
   * Dropdowns are portalled to the body, so a card's menu is not inside the card
   * and cannot be scoped to it. Picking the last visible menu instead looked
   * right and was wrong: with two dropdowns in the DOM a rename went to the
   * other card. Each dropdown carries its resume's name for exactly this reason,
   * which is also what a screen reader needs to say which resume is about to be
   * archived.
   */
  const menu = page.getByRole("menu", { name: `Actions for ${title}` });
  await expect(menu).toBeVisible();

  return menu;
};

/**
 * Presses at `from`, walks to `to` and releases, with a real pointer.
 *
 * The pointer walks in steps: dnd-kit only starts a drag after it has moved four
 * pixels, and a handle follows where the pointer has been, so a single jump would
 * be a click and a teleport, not a drag.
 *
 * The events go through CDP rather than `page.mouse`. Measured here: with a
 * button down, `page.mouse.move` over the preview iframe never resolves once a
 * drag has started (the page itself stays responsive, and no native drag is
 * reported), while the same moves sent as `Input.dispatchMouseEvent` return at
 * once and the drag completes. The app is not what hangs, Playwright's drag
 * bookkeeping is, and the raw events are what a browser receives from a person.
 */
export const pointerDrag = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 20,
  /** Keep the button down this long at `to` before letting go, moving a pixel
   * back and forth so the browser keeps sending events, which is what a held
   * drag at the edge of a page looks like. */
  holdMs = 0,
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

  await send("mouseMoved", from.x, from.y, 0);
  await send("mousePressed", from.x, from.y, 1);

  for (let step = 1; step <= steps; step += 1) {
    await send(
      "mouseMoved",
      from.x + ((to.x - from.x) * step) / steps,
      from.y + ((to.y - from.y) * step) / steps,
      1,
    );
  }

  const until = Date.now() + holdMs;

  for (let tick = 0; Date.now() < until; tick += 1) {
    await send("mouseMoved", to.x, to.y - (tick % 2), 1);
    await page.waitForTimeout(40);
  }

  await send("mouseReleased", to.x, to.y, 0);
  await cdp.detach();
};
