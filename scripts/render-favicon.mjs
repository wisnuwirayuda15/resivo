import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Rasterises the two SVG marks into the PNGs that need to be bitmaps.
 *
 * Run with `bun run generate-favicon`. The output is committed, for the same
 * reason the icon catalog is: a clean checkout should build without a dev
 * dependency having to resolve and a script having to still work.
 *
 * The SVGs are the source of truth and the only files to edit, these exist
 * purely because their consumers cannot read one. Safari has never honoured an
 * SVG favicon, `apple-touch-icon` is a bitmap by specification (a home-screen
 * shortcut with no PNG gets a screenshot of the page instead of the mark), and
 * a web app manifest may only name bitmaps, which is what the install prompt
 * and the launcher icon are drawn from.
 *
 * Rendered with the browser that is already a dev dependency rather than with an
 * image library, so nothing new is installed to convert one file. Chromium is
 * also the renderer these are judged in, which means what is written here is
 * what the browser would have drawn.
 */

/**
 * 192 and 512 are the two sizes the manifest is expected to carry: 192 is the
 * launcher icon on Android, 512 is what the install prompt and the splash
 * screen are scaled from. The maskable one is rendered from its own SVG, which
 * is drawn to survive being cropped to a circle.
 */
const OUTPUTS = [
  { source: "favicon.svg", file: "favicon-32.png", size: 32 },
  { source: "favicon.svg", file: "apple-touch-icon.png", size: 180 },
  { source: "favicon.svg", file: "icon-192.png", size: 192 },
  { source: "favicon.svg", file: "icon-512.png", size: 512 },
  { source: "icon-maskable.svg", file: "icon-maskable-512.png", size: 512 },
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const browser = await chromium.launch();

try {
  for (const { source, file, size } of OUTPUTS) {
    // A standalone SVG with a `viewBox` and no intrinsic size scales to the
    // viewport, so the viewport is the output resolution.
    const page = await browser.newPage({
      viewport: { width: size, height: size },
    });

    const path = join(root, "public", source);

    await page.goto(`file://${path.replaceAll("\\", "/")}`);
    await page.screenshot({ path: join(root, "public", file) });
    await page.close();

    console.log(`${file}  ${size}x${size}`);
  }
} finally {
  await browser.close();
}
