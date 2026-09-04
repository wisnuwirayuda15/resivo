import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Draws `public/og.png`, the card a link to Resivo unfurls into.
 *
 * Run with `bun run generate-og`. The output is committed, for the same reason
 * the favicon PNGs and the icon catalog are: a clean checkout should build
 * without a dev dependency having to resolve and a script having to still work.
 *
 * Rendered with the Chromium that is already a dev dependency, from the real
 * logo and the real vendored typeface, so the card is drawn with the same
 * assets as the app rather than approximated in an image editor. Nothing is
 * fetched: the font comes off disk as a data URL, which is also what the HTML
 * export does.
 *
 * 1200 by 630 is the size every unfurler crops from, and the safe area is
 * roughly the middle 80 percent, so nothing here sits near an edge.
 */

const WIDTH = 1200
const HEIGHT = 630

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const logo = readFileSync(join(root, 'src', 'assets', 'logo.svg'), 'utf8')

const font = readFileSync(
  join(
    root,
    'node_modules',
    '@fontsource-variable',
    'instrument-sans',
    'files',
    'instrument-sans-latin-wght-normal.woff2',
  ),
).toString('base64')

/** The design system's own values, not near misses. */
const INK = '#f2f2f0'
const MUTED = '#a2a29b'
const SUBTLE = '#8a8a83'
const GROUND = '#121210'
const ACCENT = '#32948e'

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Instrument Sans Variable';
        font-style: normal;
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${font}) format('woff2');
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        background: ${GROUND};
        color: ${INK};
        font-family: 'Instrument Sans Variable', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 96px 104px;
      }

      /* The wordmark's own accent, kept: the dot is the one saturated thing on
         the card. */
      .mark { color: ${INK}; --text-accent: ${ACCENT}; }
      .mark svg { height: 76px; width: auto; display: block; }

      h1 {
        margin-top: 56px;
        font-size: 62px;
        line-height: 1.06;
        letter-spacing: -0.025em;
        font-weight: 600;
        max-width: 20ch;
      }

      p {
        margin-top: 28px;
        font-size: 27px;
        line-height: 1.45;
        color: ${MUTED};
        max-width: 34ch;
      }

      .rule {
        margin-top: 56px;
        width: 96px;
        height: 4px;
        background: ${ACCENT};
        border-radius: 2px;
      }

      .foot {
        margin-top: 24px;
        font-size: 21px;
        color: ${SUBTLE};
      }
    </style>
  </head>
  <body>
    <div class="mark">${logo}</div>
    <h1>Your resume never leaves this browser.</h1>
    <p>Markdown in, a PDF that matches the page out.</p>
    <div class="rule"></div>
    <div class="foot">No account. No server. No copy anywhere else.</div>
  </body>
</html>
`

const browser = await chromium.launch()

try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })

  // Set rather than written to a file: the only asset is a data URL, so there
  // is nothing for a relative path to resolve against and nothing to clean up.
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(root, 'public', 'og.png') })

  console.log(`og.png  ${WIDTH}x${HEIGHT}`)
} finally {
  await browser.close()
}
