import { readFileSync, writeFileSync } from 'node:fs'
import { icons } from '@phosphor-icons/core'

/**
 * Generates the icon catalog: one search index and one glyph file per weight.
 *
 * Run with `bun run generate-icons`. The output is committed, so the repo builds
 * without this script having to run — codegen in the build would make a clean
 * checkout depend on a dev dependency being present and on this script still
 * working against whatever Phosphor version resolved.
 *
 * The split is the point. Every icon exists in six weights, and a document that
 * asks for `duotone` needs different markup from one that asks for `regular` —
 * so the glyphs cannot be shared. Emitting them as one file would mean shipping
 * all six weights to read one of them; emitting the search terms into each of
 * the six would repeat the same words six times. Hence:
 *
 *   catalog.gen.ts        names and search terms, weight-independent, ~1/6 the
 *                         size of a glyph file — this is what the picker's
 *                         search runs against
 *
 *   glyphs.<weight>.gen.ts  name and markup for one weight, fetched only when
 *                         something actually renders in that weight
 *
 * A resume that never leaves the default weight therefore pays for exactly one
 * glyph file, and the cost of the other five is not merely deferred but never
 * incurred.
 *
 * The emitted format is one tab-separated record per line inside a single
 * template literal, rather than 1512 object literals. It is a tenth of the
 * source size and it parses as one string instead of as several thousand
 * expressions.
 */

/** In the order the picker offers them: lightest to heaviest, then the two
 * filled variants. `regular` is the default and the one most builds will fetch
 * alone. */
const WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone']

const OUT_DIR = 'src/features/icons'

/** The drawable children of an icon's SVG. The assets are machine-generated and
 * uniformly shaped — a single line, self-closing shapes, no nesting — so the
 * children can be lifted out directly. Attributes are kept verbatim, which is
 * what carries duotone's `opacity` on its backing shape. */
const SHAPES = /<(?:path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*\/>/g

/** Tab, newline and backtick are the format's own delimiters, so a field
 * containing one would corrupt the file rather than fail the build. */
const assertClean = (field, what) => {
  if (field.includes('\t') || field.includes('\n') || field.includes('`')) {
    throw new Error(`${what} contains a character the format reserves`)
  }
}

const emit = (path, header, records) => {
  const file = `/* eslint-disable */
// prettier-ignore-file
${header}
export const ${records.name} = \`${records.lines.join('\n')}\`
`

  writeFileSync(path, file)

  console.log(
    `${path}: ${records.lines.length} icons, ${Math.round(file.length / 1024)} KB`,
  )
}

// ---------------------------------------------------------------------------
// The search index
// ---------------------------------------------------------------------------

const index = icons.map((icon) => {
  assertClean(icon.name, icon.name)

  // Tags and categories are joined into one haystack: the picker scores against
  // words, and which list a word came from makes no difference to a match.
  const terms = [...icon.tags, ...icon.categories]
    .join(' ')
    .toLowerCase()
    .replace(/[\t\n`]/g, ' ')

  return `${icon.name}\t${terms}`
})

emit(
  `${OUT_DIR}/catalog.gen.ts`,
  `/**
 * GENERATED — do not edit. Run \\\`bun run generate-icons\\\` to rebuild.
 *
 * Source: @phosphor-icons/core.
 * ${index.length} icons, searchable by name and by tag.
 *
 * Names and search terms only. The markup lives in \\\`glyphs.<weight>.gen.ts\\\`,
 * one file per weight — see \\\`scripts/generate-icon-catalog.mjs\\\` for why, and
 * \\\`catalog.ts\\\` for the reader.
 */`,
  { name: 'ICON_INDEX_SOURCE', lines: index },
)

// ---------------------------------------------------------------------------
// The glyphs, one file per weight
// ---------------------------------------------------------------------------

for (const weight of WEIGHTS) {
  const assets = `node_modules/@phosphor-icons/core/assets/${weight}`

  const glyphs = icons.map((icon) => {
    // Every weight but regular suffixes the file name; regular does not.
    const file =
      weight === 'regular'
        ? `${assets}/${icon.name}.svg`
        : `${assets}/${icon.name}-${weight}.svg`

    const body = (readFileSync(file, 'utf8').match(SHAPES) ?? []).join('')

    if (body === '') {
      throw new Error(`No drawable shapes found in ${file}`)
    }

    assertClean(body, `${icon.name} (${weight})`)

    return `${icon.name}\t${body}`
  })

  emit(
    `${OUT_DIR}/glyphs.${weight}.gen.ts`,
    `/**
 * GENERATED — do not edit. Run \\\`bun run generate-icons\\\` to rebuild.
 *
 * Source: @phosphor-icons/core, ${weight} weight.
 * ${glyphs.length} glyphs.
 *
 * One record per line: name, SVG body. Loaded only when something renders in
 * this weight — see \\\`catalog.ts\\\`.
 */`,
    { name: 'GLYPH_SOURCE', lines: glyphs },
  )
}
