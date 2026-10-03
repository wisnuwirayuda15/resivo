import { describe, expect, it } from "vitest";

import { ORIGIN_TOKEN, withOrigin } from "./origin";

describe("withOrigin", () => {
  it("writes the origin wherever the token is", () => {
    expect(
      withOrigin(
        `a ${ORIGIN_TOKEN}/api/mcp b ${ORIGIN_TOKEN}`,
        "https://x.dev",
      ),
    ).toBe("a https://x.dev/api/mcp b https://x.dev");
  });

  it("leaves text without the token alone", () => {
    expect(withOrigin("plain", "https://x.dev")).toBe("plain");
  });

  it("stands in a visible placeholder when no origin is known", () => {
    expect(withOrigin(ORIGIN_TOKEN, null)).not.toContain("{{");
  });
});
