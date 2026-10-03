import { expect, test } from "@playwright/test";

import type { APIRequestContext } from "@playwright/test";

/**
 * The documentation as an MCP server at `/api/mcp`.
 *
 * Speaks the protocol by hand over HTTP, which is what a client does, so the
 * specs cover the wiring a unit test cannot: the route, the transport, and the
 * three tools reading real pages in each language. They also pin what the
 * server must never offer: anything beyond those three read-only tools.
 */

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

let nextId = 1;

/** One JSON-RPC call. The reply is a single server-sent event, `data: {...}`. */
const rpc = async (
  request: APIRequestContext,
  method: string,
  params?: unknown,
): Promise<{ result?: unknown; error?: { message: string } }> => {
  const response = await request.post("/api/mcp", {
    headers: { Accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: nextId++, method, params },
  });
  const body = await response.text();
  const data = body
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);

  return JSON.parse(data ?? body) as {
    result?: unknown;
    error?: { message: string };
  };
};

const call = async (
  request: APIRequestContext,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> =>
  (await rpc(request, "tools/call", { name, arguments: args }))
    .result as ToolResult;

test.describe("docs MCP server", () => {
  test("offers three read-only tools and nothing else", async ({ request }) => {
    const { result } = await rpc(request, "tools/list");
    const names = (result as { tools: Array<{ name: string }> }).tools
      .map((tool) => tool.name)
      .sort();

    expect(names).toEqual(["get_page", "list_pages", "search"]);
  });

  test("lists the pages of a language with addresses get_page accepts", async ({
    request,
  }) => {
    const listed = await call(request, "list_pages", { lang: "id" });
    const text = listed.content[0]?.text ?? "";
    const address = /\]\(([^)]+overview\.md)\)/.exec(text)?.[1];

    expect(address).toContain("/id/docs/format/overview.md");

    const page = await call(request, "get_page", { url: address });

    expect(page.isError).toBeUndefined();
    expect(page.content[0]?.text).toContain("# Bentuk berkas");
  });

  test("reads a page in each language, by any spelling of its address", async ({
    request,
  }) => {
    const en = await call(request, "get_page", {
      url: "/en/docs/format/overview",
    });
    const id = await call(request, "get_page", {
      url: "https://elsewhere.test/id/docs/format/overview.md#sections",
    });

    expect(en.content[0]?.text).toContain("# The shape of the file");
    expect(id.content[0]?.text).toContain("# Bentuk berkas");
  });

  test("searches one language and answers with Markdown addresses", async ({
    request,
  }) => {
    const found = await call(request, "search", {
      query: "titik dua",
      lang: "id",
    });
    const hits = JSON.parse(found.content[0]?.text ?? "[]") as Array<{
      url: string;
    }>;

    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => /\/id\/docs\/.+\.md$/.test(hit.url))).toBe(true);
  });

  test("says so for a page that is not there, and for what is not a docs address", async ({
    request,
  }) => {
    for (const url of [
      "/en/docs/nope",
      "/etc/passwd",
      "../../package.json",
      "",
    ]) {
      const result = await call(request, "get_page", { url });

      expect(result.isError, url).toBe(true);
    }
  });

  test("holds no session: a stream is refused", async ({ request }) => {
    expect((await request.get("/api/mcp")).status()).toBe(405);
  });

  test("is explained on the page that tells people about it", async ({
    request,
  }) => {
    for (const lang of ["en", "id"]) {
      const page = await (
        await request.get(`/${lang}/docs/help/use-with-ai.md`)
      ).text();

      for (const tool of ["list_pages", "get_page", "search", "/api/mcp"]) {
        expect(page, `${lang} ${tool}`).toContain(tool);
      }
    }
  });
});
