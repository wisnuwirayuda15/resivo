import { describe, expect, it } from "vitest";

import { APP_PATHS, buildRobots } from "./robots";

describe("buildRobots", () => {
  it("keeps crawlers out of every app path and nothing else", () => {
    const body = buildRobots("https://resivo.test");

    for (const path of APP_PATHS) {
      expect(body).toContain(`Disallow: ${path}\n`);
    }

    expect(body).not.toMatch(/Disallow: \/(?:en|id|docs)/);
    expect(body).toContain("User-agent: *\nAllow: /");
  });

  it("names the sitemap by its absolute address", () => {
    expect(buildRobots("https://resivo.test")).toContain(
      "Sitemap: https://resivo.test/sitemap.xml",
    );
  });

  it("leaves the sitemap out when no origin is known", () => {
    expect(buildRobots(null)).not.toContain("Sitemap:");
  });
});
