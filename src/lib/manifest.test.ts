import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR } from "./seo";

/**
 * The web app manifest, checked against the app it claims to describe.
 *
 * A manifest is JSON, so it can carry no comments and no imports: every string
 * in it is a copy of something that lives somewhere else in the repo, and
 * nothing in a build would ever notice the two disagreeing. A wrong manifest
 * fails quietly and in the worst place, on somebody's home screen, after they
 * installed it.
 *
 * So this file is where the manifest's reasoning lives, and where the copies
 * are held to their originals.
 *
 * `start_url` is `/resumes` rather than `/`. The landing page exists to explain
 * the app to a stranger; somebody who has installed it is not one, and their
 * resumes are one screen further in.
 *
 * `theme_color` and `background_color` are the light ground, and picking one is
 * forced: a manifest has no way to answer `prefers-color-scheme`, while the app
 * follows the system. Light is the better of the two because the mark is drawn
 * on a dark ground, so it stays visible on the splash screen instead of
 * dissolving into it. The two scheme-aware `theme-color` meta tags in the
 * document head are unaffected and still do the real work for the browser UI.
 *
 * `display` is `standalone` because the app supplies its own chrome (a sidebar,
 * a route title, a command palette) and navigates itself.
 */

const ROOT = join(import.meta.dirname, "..", "..");

const manifest = JSON.parse(
  readFileSync(join(ROOT, "public", "manifest.webmanifest"), "utf8"),
) as {
  name: string;
  short_name: string;
  description: string;
  id: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: Array<{ src: string; sizes: string; purpose?: string }>;
};

describe("the web app manifest", () => {
  it("says what the rest of the app says", () => {
    expect(manifest.short_name).toBe(SITE_NAME);
    expect(manifest.name).toContain(SITE_NAME);
    expect(manifest.description).toBe(SITE_DESCRIPTION);
    expect(manifest.theme_color).toBe(THEME_COLOR.light);
    expect(manifest.background_color).toBe(THEME_COLOR.light);
  });

  it("opens an installed copy in the app, not on the landing page", () => {
    expect(manifest.start_url).toBe("/resumes");
    // Inside the scope, or the installed app treats its own start URL as an
    // outside link and opens it in a browser tab.
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    expect(manifest.display).toBe("standalone");
  });

  it("names icons that exist, at the sizes an installer asks for", () => {
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith("/")).toBe(true);
      expect(existsSync(join(ROOT, "public", icon.src.slice(1)))).toBe(true);
    }

    const sizes = manifest.icons.map((icon) => icon.sizes);

    // 192 for the launcher, 512 for the install prompt and the splash screen.
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");

    /**
     * At least one maskable icon, and it must not be one of the others.
     *
     * A launcher crops a maskable icon to its own shape and only the middle 80
     * percent survives, so declaring the ordinary icon maskable is how an icon
     * ends up with its corners shaved off. `public/icon-maskable.svg` is a
     * separate drawing for exactly that reason.
     */
    const maskable = manifest.icons.filter(
      (icon) => icon.purpose === "maskable",
    );

    expect(maskable).toHaveLength(1);
    expect(maskable[0]?.src).not.toBe("/icon-512.png");
  });
});
