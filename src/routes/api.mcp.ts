import { createFileRoute } from "@tanstack/react-router";

/**
 * `/api/mcp`: the documentation as an MCP server over streamable HTTP.
 *
 * Stateless, so each request builds a server, answers, and forgets it: nothing
 * is held between calls and there is nothing to scale or clean up. Public and
 * read-only (see `mcp/server.ts`); no route here reads a cookie or a header
 * beyond what the protocol itself needs.
 *
 * The handler is built on first use so the SDK and the collection are loaded by
 * a request to this route and by nothing else.
 */
const handle = async (request: Request): Promise<Response> => {
  const [{ createMcpHandler }, { createDocsMcpServer }] = await Promise.all([
    import("@modelcontextprotocol/server"),
    import("@/features/docs/mcp/server"),
  ]);
  const origin = new URL(request.url).origin;

  return createMcpHandler(() => createDocsMcpServer(origin)).fetch(request);
};

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
