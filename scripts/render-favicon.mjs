import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Rasterises `public/favicon.svg` into the two PNGs that need to be bitmaps.
 *
 * Run with `bun run generate-favicon`. The output is committed, for the same
 * reason the icon catalog is: a clean checkout should build without a dev
 * dependency having to resolve and a script having to still work.
 *
 * The SVG is the source of truth and the only file to edit — these exist purely
 * because two consumers cannot read it. Safari has never honoured an SVG
 * favicon, and `apple-touch-icon` is a bitmap by specification, so a home-screen
 * shortcut with no PNG gets a screenshot of the page instead of the mark.
 *
 * Rendered with the browser that is already a dev dependency rather than with an
 * image library, so nothing new is installed to convert one file. Chromium is
 * also the renderer the favicon is judged in, which means what is written here
 * is what the browser would have drawn.
 */

const SIZES = [
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
]

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'public', 'favicon.svg')

const browser = await chromium.launch()

try {
  for (const { file, size } of SIZES) {
    // A standalone SVG with a `viewBox` and no intrinsic size scales to the
    // viewport, so the viewport is the output resolution.
    const page = await browser.newPage({
      viewport: { width: size, height: size },
    })

    await page.goto(`file://${source.replaceAll('\\', '/')}`)
    await page.screenshot({ path: join(root, 'public', file) })
    await page.close()

    console.log(`${file}  ${size}x${size}`)
  }
} finally {
  await browser.close()
}
