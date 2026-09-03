/**
 * Turning stored assets into `data:` URLs.
 *
 * The preview hands the renderer object URLs, which live only as long as the tab
 * that made them. An exported file has to survive being emailed, so the same
 * fields are filled with `data:` URLs instead — see `exportHtml`, which cannot
 * tell the difference.
 *
 * Base64 costs a third more bytes than the blob. That is the price of a single
 * file with no network, which is the whole point of the format.
 */

import { fontRepo, imageRepo } from '@/database/index'

import paperFontsCss from '@/features/preview/paper-fonts.css?inline'

import type { FontSource } from '@/features/assets/fontFaces'
import type { ImageMap } from '@/features/assets/useAssetUrls'

/**
 * A blob as a `data:` URL.
 *
 * Not `FileReader`: that is an event-based browser API, and this runs in an
 * export path worth testing without one. `btoa` needs a binary string, and the
 * string is built in 32KB chunks because spreading a multi-megabyte array into
 * `String.fromCharCode` exceeds the argument limit — a photograph is exactly
 * large enough for that to matter.
 */
export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer())

  const CHUNK = 0x8000
  let binary = ''

  for (let at = 0; at < bytes.length; at += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK))
  }

  const mime = blob.type === '' ? 'application/octet-stream' : blob.type

  return `data:${mime};base64,${btoa(binary)}`
}

/**
 * The images a document references, as `data:` URLs.
 *
 * A row that is gone maps to `null`, exactly as in the preview — so an export of
 * a resume with a missing image produces the same visible placeholder the user
 * was already looking at, rather than silently dropping the figure.
 */
export const inlineImages = async (
  ids: ReadonlyArray<string>,
): Promise<ImageMap> => {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const record = await imageRepo.getImage(id)

      return [
        id,
        record === undefined
          ? null
          : {
              url: await blobToDataUrl(record.blob),
              width: record.width,
              height: record.height,
            },
      ] as const
    }),
  )

  return new Map(entries)
}

export const inlineFonts = async (
  ids: ReadonlyArray<string>,
): Promise<Array<FontSource>> => {
  const sources = await Promise.all(
    ids.map(async (id) => {
      const record = await fontRepo.getFont(id)

      if (record === undefined) {
        return null
      }

      const { blob, ...font } = record

      return { font, url: await blobToDataUrl(blob) }
    }),
  )

  return sources.filter((source): source is FontSource => source !== null)
}

/**
 * The bundled typefaces, inlined.
 *
 * Without this an exported file falls back to the reader's system serif, and a
 * resume typeset in Source Serif arrives in Times — which changes the line
 * breaks and therefore the pages, in a document whose whole purpose is to look
 * like the one that was laid out.
 *
 * The `woff2` files are the app's own build output, fetched from the same
 * origin. Nothing here reaches the network in the sense that matters: the export
 * is still produced entirely by this device from files it already served.
 *
 * The stylesheet arrives through `?inline`, as text, rather than being fetched
 * from its own URL. Fetching it was a dev-only trap: Vite serves a CSS file as a
 * JavaScript module in development, so what came back was a `/@vite/client`
 * import with the `@font-face` rules inside a string literal — which is not CSS,
 * and left every exported document in the reader's system serif while the
 * production build was fine. `?inline` is the processed CSS in both modes, with
 * the asset URLs already rewritten.
 */
export const inlineBuiltinFonts = async (): Promise<string> => {
  const css = paperFontsCss
  const base = window.location.href

  // Every `url(...)` in the sheet, deduplicated: the same subset file is
  // referenced by more than one rule.
  const references = [
    ...new Set(
      Array.from(
        css.matchAll(/url\((['"]?)([^'")]+)\1\)/g),
        (match) => match[2] ?? '',
      ).filter((href) => href !== '' && !href.startsWith('data:')),
    ),
  ]

  const inlined = new Map<string, string>()

  await Promise.all(
    references.map(async (href) => {
      try {
        const file = await fetch(new URL(href, base))

        if (file.ok) {
          inlined.set(href, await blobToDataUrl(await file.blob()))
        }
      } catch {
        // A face that cannot be fetched is left as it was: the export then
        // carries a relative URL that resolves to nothing, and the browser falls
        // back — which is worse than inlining it and better than no file at all.
      }
    }),
  )

  return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (whole, _quote, href) => {
    const data = inlined.get(String(href))

    return data === undefined ? whole : `url(${data})`
  })
}
