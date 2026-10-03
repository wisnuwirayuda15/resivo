import { expect, test } from "@playwright/test";

import type { APIRequestContext, Page } from "@playwright/test";

/**
 * The docs as Markdown, for readers and for agents.
 *
 * Four things a person or a model can rely on: every page has a `.md` address,
 * the normal address gives Markdown to a client that asks for it, `llms.txt`
 * lists every page and every link in it works, and the Markdown is plain, with
 * none of the components that draw the page left in it.
 */

const hydrated = async (page: Page) => {
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
};

/** What must never reach a reader of the Markdown: a tag, an import, a heading
 * id. Fenced code is skipped, because a resume sample may contain anything. */
const leftovers = (markdown: string): Array<string> => {
  let fenced = false;
  const found: Array<string> = [];

  for (const line of markdown.split("\n")) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }

    if (fenced) {
      continue;
    }

    if (
      /<\/?[A-Z][A-Za-z]*[\s/>]/.test(line) ||
      /^(?:import|export) /.test(line)
    ) {
      found.push(line);
    }

    if (/\s\[#[\w-]+\]\s*$/.test(line)) {
      found.push(line);
    }
  }

  return found;
};

const pageLinks = async (request: APIRequestContext, path: string) => {
  const text = await (await request.get(path)).text();

  return [...text.matchAll(/\]\(([^)\s]+\.md)\)/g)].map(
    (match) => match[1] ?? "",
  );
};

test.describe("docs as Markdown", () => {
  test("a page has a .md address with its title, description and body", async ({
    request,
  }) => {
    const response = await request.get("/en/docs/format/overview.md");
    const body = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(body).toMatch(/^# The shape of the file\n\n> A resume is one/);
    expect(body).toContain("Ordinary Markdown works");
    expect(leftovers(body)).toEqual([]);
  });

  test("components are written as plain Markdown", async ({ request }) => {
    const body = await (
      await request.get("/en/docs/format/overview.md")
    ).text();

    expect(body).toContain("> **Mind the colons**");
    expect(body).toContain("Press `Ctrl` + `K`");
    // The author's heading id is gone, and a link to it points at the slug a
    // Markdown renderer makes from the heading.
    expect(body).toContain("## What a section holds\n");
    expect(body).toContain("(#what-a-section-holds)");
    expect(body).not.toContain("(#sections)");
    expect(body).toContain("**macOS**");
    expect(body).toContain("### Open the editor");
    expect(body).toContain('```resume title="resume.md"');
  });

  test("links point at the language being read, as Markdown", async ({
    request,
  }) => {
    const id = await (await request.get("/id/docs/index.md")).text();

    expect(id).toMatch(
      /\]\(https?:\/\/[^)]+\/id\/docs\/format\/overview\.md\)/,
    );
    expect(id).not.toContain("](/docs");
  });

  test("the docs home is index.md, and a missing page is a 404", async ({
    request,
  }) => {
    expect((await request.get("/en/docs/index.md")).status()).toBe(200);
    expect((await request.get("/en/docs/nope.md")).status()).toBe(404);
    expect((await request.get("/xx/docs/index.md")).status()).toBe(404);
  });

  test("the normal address gives Markdown to a client that asks for it", async ({
    request,
  }) => {
    const response = await request.get("/en/docs/format/overview", {
      headers: { Accept: "text/markdown" },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(response.headers().vary).toContain("Accept");
    expect(await response.text()).toContain("# The shape of the file");
  });

  test("a browser still gets the page, and is told the answer varies", async ({
    request,
  }) => {
    const response = await request.get("/en/docs/format/overview", {
      headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
    });

    expect(response.headers()["content-type"]).toContain("text/html");
    expect(response.headers().vary).toContain("Accept");
  });

  test("llms.txt lists every page, and every link in it works", async ({
    request,
  }) => {
    const index = await request.get("/llms.txt");

    expect(index.status()).toBe(200);
    expect(index.headers()["content-type"]).toContain("text/plain");

    const links = await pageLinks(request, "/llms.txt");

    expect(links.length).toBeGreaterThan(0);
    expect(await index.text()).toContain("/id/llms.txt");

    for (const link of links) {
      const response = await request.get(link);

      expect(response.status(), link).toBe(200);
      expect(leftovers(await response.text()), link).toEqual([]);
    }
  });

  test("each language has an index and a full text of every page", async ({
    request,
  }) => {
    for (const lang of ["en", "id"]) {
      const links = await pageLinks(request, `/${lang}/llms.txt`);
      const full = await (await request.get(`/${lang}/llms-full.txt`)).text();

      expect(links.length).toBeGreaterThan(0);
      expect(leftovers(full)).toEqual([]);

      // In the sidebar's order, which starts at the home page.
      const first = (await (await request.get(links[0] ?? "")).text()).split(
        "\n",
      )[0];

      expect(full.startsWith(first ?? "?")).toBe(true);

      for (const link of links) {
        const title = (await (await request.get(link)).text()).split("\n")[0];

        expect(full, link).toContain(title);
      }
    }

    expect((await request.get("/xx/llms.txt")).status()).toBe(404);
    expect((await request.get("/xx/llms-full.txt")).status()).toBe(404);
  });

  test("a page advertises its Markdown in the head", async ({ page }) => {
    await page.goto("/en/docs/format/overview");

    await expect(
      page.locator('link[rel="alternate"][type="text/markdown"]'),
    ).toHaveAttribute("href", "/en/docs/format/overview.md");
  });
});

test.describe("page actions", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("Copy page puts the Markdown on the clipboard", async ({ page }) => {
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    const copy = page.getByRole("button", { name: "Copy page" });

    await copy.click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

    const text = await page.evaluate(() => navigator.clipboard.readText());

    expect(text).toContain("# The shape of the file");
    expect(text).toContain("> **Mind the colons**");
    expect(leftovers(text)).toEqual([]);
  });

  test("View as Markdown links to the .md address", async ({ page }) => {
    await page.goto("/id/docs/format/overview");
    await hydrated(page);

    await expect(
      page.getByRole("link", { name: "Lihat sebagai Markdown" }),
    ).toHaveAttribute("href", "/id/docs/format/overview.md");
  });

  test("the assistant menu carries only the address of the public page", async ({
    page,
  }) => {
    await page.goto("/en/docs/format/overview");
    await hydrated(page);
    await page.getByRole("button", { name: "Ask an assistant" }).click();

    const claude = page.getByRole("menuitem", { name: "Open in Claude" });
    const chatgpt = page.getByRole("menuitem", { name: "Open in ChatGPT" });

    await expect(claude).toHaveAttribute(
      "href",
      /^https:\/\/claude\.ai\/new\?q=/,
    );
    await expect(chatgpt).toHaveAttribute(
      "href",
      /^https:\/\/chatgpt\.com\/\?q=/,
    );

    const href = (await claude.getAttribute("href")) ?? "";
    const prompt = decodeURIComponent(href.split("q=")[1] ?? "");

    expect(prompt).toContain("/en/docs/format/overview.md");
  });
});
