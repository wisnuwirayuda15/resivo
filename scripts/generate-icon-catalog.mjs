import { readFileSync, writeFileSync } from 'node:fs'
import { icons } from '@phosphor-icons/core'

/**
 * Generates the icon catalog.
 *
 * Run with `bun run generate-icons`. The output is committed, so the repo builds
 * without this script having to run — codegen in the build would make a clean
 * checkout depend on a dev dependency being present and on this script still
 * working against whatever Phosphor version resolved.
 *
 * Two things are baked in, both read from `@phosphor-icons/core`:
 *
 *   the search index — name, tags and categories, so the picker can find
 *   "trash" by typing "delete"
 *
 *   the glyph — the regular weight's markup, so 1512 icons can be drawn without
 *   importing 1512 React components. That is the whole reason this file exists:
 *   the component package is 18MB of source across per-icon modules, and the
 *   picker needs to show all of them.
 *
 * The emitted format is one tab-separated record per line inside a single
 * template literal, rather than 1512 object literals. It is a tenth of the
 * source size and it parses as one string instead of as several thousand
 * expressions.
 */

const WEIGHT = 'regular'
const ASSETS = `node_modules/@phosphor-icons/core/assets/${WEIGHT}`
const OUTPUT = 'src/features/icons/catalog.gen.ts'

/** The drawable children of an icon's SVG. The assets are machine-generated and
 * uniformly shaped — a single line, self-closing shapes, no nesting — so the
 * children can be lifted out directly. */
const SHAPES = /<(?:path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*\/>/g

const records = icons.map((icon) => {
  const svg = readFileSync(`${ASSETS}/${icon.name}.svg`, 'utf8')
  const body = (svg.match(SHAPES) ?? []).join('')

  if (body === '') {
    throw new Error(`No drawable shapes found in ${icon.name}.svg`)
  }

  for (const field of [icon.name, body]) {
    if (field.includes('\t') || field.includes('\n') || field.includes('`')) {
      throw new Error(`${icon.name} contains a character the format reserves`)
    }
  }

  // Tags and categories are joined into one haystack: the picker scores against
  // words, and which list a word came from makes no difference to a match.
  const terms = [...icon.tags, ...icon.categories]
    .join(' ')
    .toLowerCase()
    .replace(/[\t\n`]/g, ' ')

  return `${icon.name}\t${terms}\t${body}`
})

const file = `/* eslint-disable */
// prettier-ignore-file
/**
 * GENERATED — do not edit. Run \`bun run generate-icons\` to rebuild.
 *
 * Source: @phosphor-icons/core, ${WEIGHT} weight.
 * ${records.length} icons.
 *
 * One record per line: name, search terms, SVG body. See
 * \`scripts/generate-icon-catalog.mjs\` for why it is a string and not an array
 * of objects, and \`catalog.ts\` for the reader.
 */
export const ICON_CATALOG_SOURCE = \`${records.join('\n')}\`
`

writeFileSync(OUTPUT, file)

console.log(
  `${OUTPUT}: ${records.length} icons, ${Math.round(file.length / 1024)} KB`,
)
