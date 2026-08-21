/**
 * Turning a picked font file into something the fonts table can hold.
 *
 * A bad font is worse than a bad image: the browser silently falls back, so the
 * resume keeps printing but in the wrong face, and nothing anywhere says why.
 * So the file is not merely sniffed — it is handed to the font engine and only
 * accepted if that engine parses it.
 */

import type { AddFontInput } from '@/database/repositories/fonts'
import type { FontRecord } from '@/database/records'

export class FontRejected extends Error {}

export const FONT_ACCEPT = '.woff2,.woff,.ttf,.otf,font/woff2,font/woff'

/** 4MB. A single weight of a text face is well under 1MB even uncompressed; past
 * this it is a variable font with a hundred writing systems, or not a font. */
export const MAX_FONT_BYTES = 4 * 1024 * 1024

/**
 * The first four bytes, which is where every format this accepts declares
 * itself. Extensions are not trusted: a `.ttf` that is really a WOFF2 would be
 * stored with the wrong `format()` hint and then fail to load with no
 * explanation.
 */
const SIGNATURES: Array<[string, FontRecord['format']]> = [
  ['wOF2', 'woff2'],
  ['wOFF', 'woff'],
  ['OTTO', 'otf'],
  // TrueType's version tag is the number 0x00010000, not text.
  ['\u0000\u0001\u0000\u0000', 'ttf'],
  ['true', 'ttf'],
  ['ttcf', 'ttf'],
]

const detectFormat = (head: Uint8Array): FontRecord['format'] | undefined => {
  const tag = Array.from(head.slice(0, 4), (byte) =>
    String.fromCharCode(byte),
  ).join('')

  return SIGNATURES.find(([signature]) => signature === tag)?.[1]
}

/**
 * Whether the font engine can actually use these bytes.
 *
 * `FontFace.load()` is the only honest check available in a browser: it runs the
 * same parser that would later refuse the face, so a file that passes here
 * cannot fail silently on the paper. The face is never added to the document —
 * constructing and loading it is enough to validate.
 */
const validate = async (bytes: ArrayBuffer): Promise<void> => {
  if (typeof FontFace === 'undefined') {
    return
  }

  try {
    await new FontFace('resivo-probe', bytes).load()
  } catch {
    throw new FontRejected(
      'That file is not a font this browser can read. If it is an older ' +
        'format, converting it to WOFF2 usually works.',
    )
  }
}

/**
 * Weight and style, guessed from the file name.
 *
 * A guess, and named as one: the metadata that would say for certain lives in
 * the font's own `OS/2` table, and parsing that would mean shipping a font
 * parser to read two numbers. The name is what type foundries encode this in
 * anyway, and the gallery shows the result so a wrong guess is visible and the
 * file can be renamed.
 */
const NAMED_WEIGHTS: Array<[RegExp, number]> = [
  [/thin|hairline/i, 100],
  [/extra-?light|ultra-?light/i, 200],
  [/light/i, 300],
  [/regular|normal|book/i, 400],
  [/medium/i, 500],
  [/semi-?bold|demi-?bold/i, 600],
  [/extra-?bold|ultra-?bold/i, 800],
  [/black|heavy/i, 900],
  // Last, so "semibold" is not read as "bold".
  [/bold/i, 700],
]

const STYLE_TOKENS =
  /[-_ ](?:thin|extra|ultra|semi|demi|light|regular|normal|book|medium|bold|black|heavy|italic|oblique|hairline)+/gi

interface FontGuess {
  family: string
  weight: number
  style: FontRecord['style']
}

export const guessFromFilename = (filename: string): FontGuess => {
  const base = filename.replace(/\.[^.]+$/, '')
  const numeric = /(?:^|[-_ ])([1-9]00)(?:$|[-_ ])/.exec(base)

  const weight =
    numeric === null
      ? (NAMED_WEIGHTS.find(([pattern]) => pattern.test(base))?.[1] ?? 400)
      : Number(numeric[1])

  const family =
    base
      .replace(STYLE_TOKENS, ' ')
      .replace(/(?:^|[-_ ])[1-9]00(?=$|[-_ ])/g, ' ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || base

  return {
    family,
    weight,
    style: /italic|oblique/i.test(base) ? 'italic' : 'normal',
  }
}

export const readFontFile = async (file: File): Promise<AddFontInput> => {
  if (file.size > MAX_FONT_BYTES) {
    throw new FontRejected(
      `That file is ${Math.round(file.size / 1024)}KB. The limit is ` +
        `${MAX_FONT_BYTES / 1024}KB, which is generous for one weight of a text face.`,
    )
  }

  const bytes = await file.arrayBuffer()
  const format = detectFormat(new Uint8Array(bytes.slice(0, 4)))

  if (format === undefined) {
    throw new FontRejected(
      'That file is not a WOFF2, WOFF, TrueType or OpenType font — whatever its ' +
        'name says.',
    )
  }

  await validate(bytes)

  const guess = guessFromFilename(file.name)

  return { ...guess, blob: file, format }
}
