import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

import {
  createResume,
  expectPaperReady,
  openEditorPane,
  openEmptyApp,
  paper,
} from "./app";

/**
 * The editor on a screen that cannot hold three panes.
 *
 * The pane minimums add up to 888px, plus two handles and a 232px sidebar, so
 * three panes need a 1122px viewport before the layout is even usable. There was
 * no breakpoint anywhere in the app, so below that the editor overflowed
 * sideways and the paper was pushed off the screen.
 */

test("falls back to one pane at a time on a narrow screen", async ({
  page,
}) => {
  test.slow();

  await page.setViewportSize({ width: 900, height: 800 });

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  // The tab strip, which only exists below the breakpoint.
  await expect(
    page.getByRole("tablist", { name: "Editor panes" }),
  ).toBeVisible();
  await expectPaperReady(page);

  // Nothing overflows sideways: the document is the whole width, not a third of
  // a layout that does not fit.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The other two panes are a tab away rather than gone.
  await openEditorPane(page, "Code");
  await expect(page.locator(".monaco-editor").first()).toBeVisible();

  await openEditorPane(page, "Style");
  await expect(page.getByLabel("Body size")).toBeVisible();

  /**
   * Back to the paper, and it paginates again.
   *
   * This is the assertion that matters for the tabs: an inactive Mantine panel
   * is `display: none`, so a preview left mounted in one would measure its paper
   * at zero width. Unmounting is what keeps the paper measured at the width it
   * is drawn at.
   */
  await openEditorPane(page, "Paper");
  await expectPaperReady(page);
  await expect(paper(page).locator(".rp-page").first()).toBeVisible();
});

test("uses all three panes once there is room", async ({ page }) => {
  test.slow();

  await page.setViewportSize({ width: 1440, height: 900 });

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  // No tab strip, and all three panes at once.
  await expect(page.getByRole("tablist", { name: "Editor panes" })).toHaveCount(
    0,
  );
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  await expect(page.getByLabel("Body size")).toBeVisible();
  await expectPaperReady(page);
});

/**
 * The rail is for the permanent sidebar only.
 *
 * Below Mantine's `sm` the navbar is an overlay the burger shows and hides, and
 * a third state between those two is not a state: 60px of icons is not a useful
 * way to present the one thing the overlay was opened to show. So a preference
 * carried over from a wide screen has to be ignored rather than honoured.
 */
test("ignores a collapsed sidebar where the sidebar is an overlay", async ({
  page,
}) => {
  await openEmptyApp(page);

  // Collapsed while the sidebar is still permanent, which is the only place the
  // control exists.
  await page.getByRole("button", { name: "Toggle sidebar" }).click();

  await page.setViewportSize({ width: 600, height: 800 });

  // The toggle goes with the sidebar it toggles; the burger takes its place.
  await expect(
    page.getByRole("button", { name: "Toggle sidebar" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Toggle navigation" }).click();

  // A drawer, with its labels back, not the rail the stored preference still
  // asks for, and not the whole viewport either: a drawer with no page beside
  // it leaves nothing to tap to dismiss it.
  const width = await page
    .getByRole("navigation")
    .evaluate((node) => Math.round(node.getBoundingClientRect().width));
  expect(width).toBeLessThan(600);
  await expect(page.getByText("No account. No cloud.")).toBeVisible();
});

/** A phone, not a narrow desktop window. */
const PHONE = { width: 375, height: 812 };

/**
 * The editor at phone width.
 *
 * The 900px case above only exercises the pane fallback. At 375 the row of
 * controls over the paper is the thing that did not fit: the page dimensions,
 * both segmented controls and four zoom buttons in one 38px strip made that
 * header 433px wide, and since nothing there scrolls it took the whole editor (
 * and the document) with it.
 */
test("fits a phone, with nothing pushed off the side", async ({ page }) => {
  test.slow();

  await page.setViewportSize(PHONE);

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
  await expectPaperReady(page);

  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

  expect(await overflow()).toBe(0);

  // Every pane, since each one is a different row of controls.
  for (const pane of ["Code", "Style", "Paper"] as const) {
    await openEditorPane(page, pane);
    expect(await overflow()).toBe(0);
  }

  // What the strip keeps at this width.
  await expect(page.getByText("1 page")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();

  /**
   * And what it folds away rather than drops.
   *
   * These three were simply absent on a phone, which is the complaint this
   * covers: an indicator that exists on a desktop and nowhere else is a
   * feature the small screen does not have.
   */
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeHidden();
  await page.getByRole("button", { name: "Paper and zoom" }).click();

  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit width" })).toBeVisible();
  // The label, not the radio: Mantine's segmented control parks the real input
  // off-screen and styles the label, so the input is never "visible".
  await expect(page.locator("label").filter({ hasText: /^A4$/ })).toBeVisible();

  // The zoom really is the paper's, not a readout of its own.
  const zoom = () => page.getByText(/^\d+%$/).innerText();
  const before = await zoom();

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(zoom).not.toBe(before);
});

/**
 * The navbar on a phone is a drawer.
 *
 * Mantine gives it the full viewport width below the breakpoint, which put it
 * over the header, so the burger that opened it was underneath it, and with no
 * scrim and nothing beside it to tap, the only way out was to navigate
 * somewhere. Opening the menu to look at it was a one-way trip.
 */
test("the navbar drawer closes when the page beside it is tapped", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await openEmptyApp(page);

  const drawer = page.locator("nav.mantine-AppShell-navbar");
  const settings = page.getByRole("link", { name: "Settings" });

  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(settings).toBeInViewport();

  // There is a page beside it to tap at all, which is the half of the fix that
  // is easy to lose: a full-width drawer has no outside.
  const box = await drawer.boundingBox();
  expect(box?.width ?? PHONE.width).toBeLessThan(PHONE.width);

  await page.mouse.click(PHONE.width - 20, 500);
  await expect(settings).not.toBeInViewport();
});

/**
 * Whether the tour is pointing at something on screen.
 *
 * The card is only centred when its step found no anchor, so a card that is not
 * is one that has an anchor, and the spotlight cutout is that anchor's box. Its
 * centre has to be inside the viewport: the card can be fully on screen while
 * the thing it describes is behind a closed drawer or a tab that is not open.
 * Polled, because the cutout follows an anchor that is still sliding in.
 */
const expectSpotlightOnScreen = async (page: Page) => {
  await expect(page.locator(".mantine-Tour-tooltip")).not.toHaveAttribute(
    "data-centered",
    "true",
  );

  await expect
    .poll(async () => {
      const centre = await page
        .locator(".mantine-Tour-spotlight")
        .evaluate((node) => {
          // The attributes and not `getBoundingClientRect`, which is empty for
          // a rect inside a mask. The overlay is the size of the viewport, so
          // they are viewport coordinates.
          const read = (name: string) => Number(node.getAttribute(name));

          return {
            x: read("x") + read("width") / 2,
            y: read("y") + read("height") / 2,
          };
        });
      const viewport = page.viewportSize();

      return (
        viewport !== null &&
        centre.x > 0 &&
        centre.x < viewport.width &&
        centre.y > 0 &&
        centre.y < viewport.height
      );
    })
    .toBe(true);
};

/**
 * The tour, on the screen where it had the least room to work.
 *
 * Two things were wrong at phone width. The popover renders at a fixed 374px,
 * so on a 375px screen the text was clipped and "Next" sat off the right edge,
 * a tour that could be started and not finished. And two of the library's steps
 * point at rows in the sidebar, which is a drawer here: the tour dimmed the app,
 * highlighted nothing, and left nothing on screen to go on with.
 */
test("the tour can be walked through on a phone", async ({ page }) => {
  test.slow();

  await page.setViewportSize(PHONE);
  await openEmptyApp(page);

  // Opted back in, the way the onboarding spec does.
  await page.evaluate(() => {
    localStorage.removeItem("resivo.onboarding.library");
    localStorage.removeItem("resivo.onboarding.editor");
  });
  await page.reload();

  /**
   * The card's own box, not the content inside it.
   *
   * The tour sizes this element to the room it has, so it is what has to sit
   * inside the viewport: the width it reports is the width it was given.
   */
  const card = page.locator(".mantine-Tour-tooltip");

  await expect(page.getByText("Start here")).toBeVisible({ timeout: 20_000 });

  // Inside the viewport at every step, and pointing at something visible at
  // every step, the two halves of "it works here at all".
  for (const heading of [
    "Images and fonts are shared",
    "This is the important one",
    "Everything, from the keyboard",
  ]) {
    await expect(card).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(heading)).toBeVisible();
    await expectSpotlightOnScreen(page);
  }

  await expect(card).toBeInViewport({ ratio: 1 });

  /**
   * And using the width it has.
   *
   * A card that fits by being small is not the fix asked for: this one is
   * capped at the viewport less an 8px gutter each side, so on a 375px screen
   * it should be 359px rather than its 460px cap clipped to fit.
   */
  const width = await card.evaluate((node) =>
    Math.round(node.getBoundingClientRect().width),
  );
  expect(width).toBe(PHONE.width - 16);
});

/**
 * The editor tour, on the screen it used not to run on at all.
 *
 * It was gated off below 1200px, because four of its six steps pointed at panes
 * that are not mounted there: one pane shows at a time and `keepMounted={false}`
 * keeps the other two out of the document. The gate meant a phone user was
 * never shown the editor, and the two anchors that did exist were full-height
 * columns, beside which a popover has nowhere to go.
 *
 * Both halves are fixed here: the tour asks for the tab each step needs, and
 * the three pane steps point at the tab that opens the pane rather than at the
 * pane itself.
 */
test("the editor tour runs on a phone, one tab at a time", async ({ page }) => {
  test.slow();

  await page.setViewportSize(PHONE);
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  // Opted back in for the editor only, and reloaded so it starts here.
  await page.evaluate(() =>
    localStorage.removeItem("resivo.onboarding.editor"),
  );
  await page.reload();

  const card = page.locator(".mantine-Tour-tooltip");

  // Scoped to the editor's own strip: the inspector has a tab called Style
  // too, and both are on screen once that pane is open.
  const paneTab = (name: string) =>
    page
      .getByRole("tablist", { name: "Editor panes" })
      .getByRole("tab", { name, selected: true });

  /**
   * Each step, with the tab it has to have opened.
   *
   * The tab is the assertion that matters. A step can look right and be
   * pointing at a pane the reader cannot see, which is exactly what the old
   * gate was avoiding rather than fixing.
   */
  const steps = [
    { heading: "Markdown, and your own CSS", tab: "Code" },
    { heading: "Every directive, with an example", tab: "Code" },
    { heading: "The paper is editable too", tab: "Paper" },
    { heading: "Export is the same document", tab: "Paper" },
    { heading: "Four tabs worth knowing", tab: "Style" },
    { heading: "Nothing here is one-way", tab: "Style" },
  ] as const;

  await expect(page.getByText(steps[0].heading)).toBeVisible({
    timeout: 30_000,
  });

  for (const [index, step] of steps.entries()) {
    await expect(page.getByText(step.heading)).toBeVisible();
    await expect(paneTab(step.tab)).toBeVisible();

    // On screen, and pointing at something on screen.
    await expect(card).toBeInViewport({ ratio: 1 });
    await expectSpotlightOnScreen(page);

    if (index < steps.length - 1) {
      await page.getByRole("button", { name: "Next" }).click();
    }
  }

  // Ending it hands the tab strip back rather than leaving it where the tour
  // stopped: the paper is the pane the editor opens on.
  await page.getByRole("button", { name: "End" }).click();
  await expect(paneTab("Paper")).toBeVisible();
});
