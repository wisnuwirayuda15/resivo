import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

import { SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import { renderIndex, renderPage } from "../markdown/server";
import { markdownHref } from "../markdown/urls";
import { isDocsLanguage } from "../paths";
import { searchServerFor } from "../search/server";
import { source } from "../source";

import { docsTarget } from "./target";

import type { DocsLanguage } from "../paths";

/**
 * The documentation as an MCP server, for assistants that speak the protocol.
 *
 * Read-only and public: three tools over the same Markdown that `llms.txt`
 * serves, and nothing else. There is no resume data on a server to expose (it
 * lives in the reader's browser), no write tool, no filesystem access, and no
 * credential. Written here and not with Fumadocs' `registerSourceTools` because
 * those tools take no language, list every language at once and hand back
 * addresses without `.md`; a model is better served by a `lang` argument and
 * addresses it can pass straight back to `get_page`.
 *
 * Server only: it imports the collection.
 */

const LANGUAGE = z
  .enum(SUPPORTED_LANGUAGES)
  .optional()
  .describe("Documentation language. Defaults to English.");

const text = (value: string, isError = false) => ({
  content: [{ type: "text" as const, text: value }],
  ...(isError ? { isError: true } : {}),
});

/** At most this many hits come back from a search: a model reads every one, and
 * the best few are all it can use. */
const MAX_HITS = 10;

export const createDocsMcpServer = (origin: string): McpServer => {
  const server = new McpServer({ name: "resivo-docs", version: "1.0.0" });

  server.registerTool(
    "list_pages",
    {
      title: "List pages",
      description:
        "List every documentation page in one language, with a one-line description and its Markdown address. Pass an address to get_page.",
      inputSchema: z.object({ lang: LANGUAGE }),
    },
    async ({ lang }) => text(await renderIndex(lang ?? "en", origin)),
  );

  server.registerTool(
    "get_page",
    {
      title: "Get page",
      description:
        "Get the Markdown of one documentation page. Accepts the address from list_pages or search, with or without the origin and the .md ending.",
      inputSchema: z.object({
        url: z
          .string()
          .describe("A page address, such as /en/docs/format/overview.md"),
      }),
    },
    async ({ url }) => {
      const target = docsTarget(url);
      const page =
        target !== null && isDocsLanguage(target.lang)
          ? source.getPage(target.slugs, target.lang)
          : undefined;

      return page === undefined
        ? text(
            `Page not found: ${url}. Use list_pages for the addresses that exist.`,
            true,
          )
        : text(await renderPage(page, origin));
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search the documentation",
      description:
        "Search the pages of one language. Returns the best matching pages, headings and passages, each with the Markdown address of its page.",
      inputSchema: z.object({
        query: z.string().min(1).max(200),
        lang: LANGUAGE,
      }),
    },
    async ({ query, lang }) => {
      const language: DocsLanguage = lang ?? "en";
      const hits = await searchServerFor(language).search(query);

      return text(
        JSON.stringify(
          hits.slice(0, MAX_HITS).map((hit) => {
            const [path] = hit.url.split("#");
            const target = docsTarget(path ?? hit.url);

            return {
              type: hit.type,
              content: hit.content,
              url:
                target !== null && isDocsLanguage(target.lang)
                  ? `${origin}${markdownHref(target.lang, target.slugs)}`
                  : hit.url,
            };
          }),
        ),
      );
    },
  );

  return server;
};
