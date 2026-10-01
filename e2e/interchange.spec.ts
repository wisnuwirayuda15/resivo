import { expect, test } from "@playwright/test";

import { createResume, openEmptyApp, paperText } from "./app";

import type { Download, Page } from "@playwright/test";

/**
 * Files in, and files out, in the formats other tools use.
 *
 * The unit tests cover what each reader and writer does with a document. What
 * only a browser can say is that the dialog accepts the file, shows what came of
 * reading it, builds the resume from it, and that the menu hands back a file with
 * the right name and the right bytes.
 */

const JSON_RESUME = {
  basics: {
    name: "Grace Hopper",
    label: "Computer scientist",
    email: "grace@example.com",
    image: "https://example.com/grace.jpg",
  },
  work: [
    {
      name: "Remington Rand",
      position: "Senior Mathematician",
      startDate: "1949-04",
      endDate: "1959-12",
      highlights: ["Wrote the first compiler"],
    },
  ],
  skills: [{ name: "Languages", keywords: ["COBOL", "FLOW-MATIC"] }],
};

const PLAIN_TEXT = [
  "GRACE HOPPER",
  "Computer scientist",
  "grace@example.com | Arlington, VA",
  "",
  "WORK HISTORY",
  "Senior Mathematician, Remington Rand",
  "• Wrote the first compiler",
  "",
  "SKILLS",
  "COBOL, FLOW-MATIC",
].join("\n");

const openImportDialog = async (page: Page) => {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await expect(dialog).toBeVisible();

  return dialog;
};

const chooseFile = async (
  page: Page,
  file: { name: string; mimeType: string; text: string },
) => {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import a file" }).click();
  await (
    await chooser
  ).setFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: Buffer.from(file.text),
  });
};

const readDownload = async (download: Download): Promise<string> => {
  const stream = await download.createReadStream();
  const chunks: Array<Buffer> = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

test("a JSON Resume file becomes a resume, and says what it left out", async ({
  page,
}) => {
  await openEmptyApp(page);

  const dialog = await openImportDialog(page);

  await chooseFile(page, {
    name: "grace.json",
    mimeType: "application/json",
    text: JSON.stringify(JSON_RESUME),
  });

  // The name field is filled from the file, and the photograph, which a resume
  // here has no way to fetch, is called out rather than dropped quietly.
  await expect(dialog.getByLabel("Name")).toHaveValue("Grace Hopper");
  await expect(dialog.getByText("grace.json")).toBeVisible();
  await expect(dialog.getByText(/the photograph/)).toBeVisible();

  await dialog.getByRole("button", { name: "Create resume" }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Senior Mathematician");

  const text = await paperText(page);

  expect(text).toContain("Grace Hopper");
  expect(text).toContain("Remington Rand");
  expect(text).toContain("Wrote the first compiler");
  expect(text).toContain("COBOL");
});

test("a plain text resume is read for its sections", async ({ page }) => {
  await openEmptyApp(page);

  const dialog = await openImportDialog(page);

  await chooseFile(page, {
    name: "resume.txt",
    mimeType: "text/plain",
    text: PLAIN_TEXT,
  });

  await expect(dialog.getByLabel("Name")).toHaveValue("GRACE HOPPER");

  await dialog.getByRole("button", { name: "Create resume" }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("COBOL");

  const text = await paperText(page);

  // Headings in capitals became sections, and the paper says them in its own
  // case, so this compares without regard to it.
  expect(text).toMatch(/work history/i);
  expect(text).toMatch(/skills/i);
  expect(text).toContain("Wrote the first compiler");
});

test("a JSON file that is not a resume is refused", async ({ page }) => {
  await openEmptyApp(page);

  const dialog = await openImportDialog(page);

  await chooseFile(page, {
    name: "package.json",
    mimeType: "application/json",
    text: JSON.stringify({ name: "not-a-resume", version: "1.0.0" }),
  });

  await expect(dialog.getByText(/is not a JSON Resume/)).toBeVisible();
  // Nothing was loaded, so there is no file named in the dialog to create from.
  await expect(dialog.getByText("package.json")).toBeHidden();
});

test("exports the resume as JSON Resume and as plain text", async ({
  page,
}) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace", { start: "Example resume" });

  await page.getByRole("button", { name: "Export" }).click();

  const json = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^JSON Resume/ }).click();

  const jsonFile = await json;
  expect(jsonFile.suggestedFilename()).toMatch(/\.json$/);

  const parsed = JSON.parse(await readDownload(jsonFile)) as {
    basics: { name: string; email: string };
    work: Array<{ position: string }>;
  };

  expect(parsed.basics.name).toBe("Ada Lovelace");
  expect(parsed.basics.email).toBe("ada@example.com");
  expect(parsed.work[0]?.position).toBe("Analyst");

  await page.getByRole("button", { name: "Export" }).click();

  const plain = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^Plain text/ }).click();

  const plainFile = await plain;
  expect(plainFile.suggestedFilename()).toMatch(/\.txt$/);

  const text = await readDownload(plainFile);

  expect(text.startsWith("Ada Lovelace\n")).toBe(true);
  expect(text).toContain("EXPERIENCE");
  expect(text).toContain("- Wrote Note G");
});
