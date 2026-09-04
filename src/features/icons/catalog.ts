/**
 * The icon catalog: 1512 names, their search terms, and their glyphs in every
 * one of Phosphor's six weights.
 *
 * Loaded lazily, and in two independent pieces, because the two have different
 * shapes:
 *
 *   the index, names and search terms, ~110KB, weight-independent. The picker's
 *   search runs against this and nothing else, so typing is never waiting on
 *   markup.
 *
 *   the glyphs, one file per weight, ~600-800KB each. Fetched only for a weight
 *   something actually renders in. A document that stays on the default pays for
 *   one of the six; the other five are not deferred, they are never fetched.
 *
 * Nothing here reflects over the icon package at runtime. Both are generated and
 * committed (see `scripts/generate-icon-catalog.mjs`), so the set of icons a
 * build ships is fixed at build time and a document that names one cannot depend
 * on what happens to be installed.
 */

import { ICON_WEIGHTS } from '@/features/resume/model/document'

import type { IconWeight } from '@/features/resume/model/document'

export interface IconEntry {
  /** Kebab-case, as the document model stores it. */
  name: string
  /** Tags and categories, lowercased and space-joined. */
  terms: string
}

export interface IconCatalog {
  entries: Array<IconEntry>
  byName: Map<string, IconEntry>
}

/** Name to SVG children, for one weight. */
export type GlyphSet = Map<string, string>

export const parseCatalog = (source: string): IconCatalog => {
  const entries = source
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [name = '', terms = ''] = line.split('\t')

      return { name, terms }
    })

  return { entries, byName: new Map(entries.map((e) => [e.name, e])) }
}

export const parseGlyphs = (source: string): GlyphSet =>
  new Map(
    source
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => {
        const [name = '', body = ''] = line.split('\t')

        return [name, body] as const
      }),
  )

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * The import per weight, written out rather than built from a template string,
 * because the bundler has to see each one to split it into its own chunk. A
 * computed `import(\`./glyphs.${weight}.gen\`)` would either fail to resolve or
 * pull all six into the graph, which is the exact cost this file exists to
 * avoid.
 */
const GLYPH_IMPORTS: Record<
  IconWeight,
  () => Promise<{ GLYPH_SOURCE: string }>
> = {
  thin: () => import('./glyphs.thin.gen'),
  light: () => import('./glyphs.light.gen'),
  regular: () => import('./glyphs.regular.gen'),
  bold: () => import('./glyphs.bold.gen'),
  fill: () => import('./glyphs.fill.gen'),
  duotone: () => import('./glyphs.duotone.gen'),
}

/** Notified when the index or any weight arrives, so anything already rendered (
 * the paper, above all) can draw the glyphs it had to leave as reserved
 * space. */
const listeners = new Set<() => void>()

const announce = () => {
  for (const listener of listeners) {
    listener()
  }
}

export const onIconCatalogLoaded = (listener: () => void): (() => void) => {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

let catalog: IconCatalog | null = null
let catalogPending: Promise<IconCatalog> | null = null

export const loadIconCatalog = (): Promise<IconCatalog> => {
  if (catalog !== null) {
    return Promise.resolve(catalog)
  }

  // One request no matter how many components ask at once: the picker and the
  // preview both want it, and they mount together.
  catalogPending ??= import('./catalog.gen').then((module) => {
    catalog = parseCatalog(module.ICON_INDEX_SOURCE)
    catalogPending = null
    announce()

    return catalog
  })

  return catalogPending
}

const glyphs = new Map<IconWeight, GlyphSet>()
const glyphsPending = new Map<IconWeight, Promise<GlyphSet>>()

export const loadGlyphs = (weight: IconWeight): Promise<GlyphSet> => {
  const loaded = glyphs.get(weight)

  if (loaded !== undefined) {
    return Promise.resolve(loaded)
  }

  const inFlight = glyphsPending.get(weight)

  if (inFlight !== undefined) {
    return inFlight
  }

  const request = GLYPH_IMPORTS[weight]().then((module) => {
    const parsed = parseGlyphs(module.GLYPH_SOURCE)

    glyphs.set(weight, parsed)
    glyphsPending.delete(weight)
    announce()

    return parsed
  })

  glyphsPending.set(weight, request)

  return request
}

/** One weight's glyphs if they are already here, `null` otherwise. */
export const loadedGlyphs = (weight: IconWeight): GlyphSet | null =>
  glyphs.get(weight) ?? null

/**
 * How many weights have arrived. The paper watches this rather than a boolean,
 * because a second weight landing changes what is drawn just as much as the
 * first did.
 */
export const loadedGlyphCount = (): number => glyphs.size

/** Whether a string is one of the weights this build carries. Used where a
 * weight comes from a saved document rather than from the app. */
export const isIconWeight = (value: string): value is IconWeight =>
  (ICON_WEIGHTS as ReadonlyArray<string>).includes(value)

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Scores one icon against a query. Higher is better; zero means no match.
 *
 * Hand-rolled rather than a fuzzy-search dependency, because what makes a good
 * result here is domain-specific and short to express: an exact name beats a
 * prefix, a prefix beats a word boundary, a name beats a tag, and a scattered
 * subsequence is a last resort. `match-sorter` would rank "arrow-square-out"
 * above "arrow" for the query "arrow", which is exactly wrong for a grid where
 * the obvious answer must be first.
 */
export const scoreIcon = (entry: IconEntry, query: string): number => {
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return 1
  }

  const { name, terms } = entry

  if (name === needle) {
    return 1000
  }

  if (name.startsWith(needle)) {
    // Shorter names win the tie-break below, so "star" outranks "star-four".
    return 800
  }

  // A word boundary inside the name: "envelope-simple" for "simple".
  if (name.includes(`-${needle}`)) {
    return 600
  }

  /**
   * A whole tag ranks above a name the query merely appears *inside*, which is
   * the one ordering here that took a real result to get right: for "mail",
   * `envelope` (tagged "mail") is what someone wants, and `voicemail` is not,
   * even though the latter matches its own name.
   */
  if (terms.split(' ').some((term) => term === needle)) {
    return 500
  }

  if (name.includes(needle)) {
    return 400
  }

  if (terms.includes(needle)) {
    return 200
  }

  return isSubsequence(needle, name) ? 100 : 0
}

/**
 * Whether every character of `needle` appears in `haystack` in order.
 *
 * The last resort, and the reason a typo still finds something: "envlp" reaches
 * "envelope". Deliberately unscored beyond a flat 100, ranking scattered
 * matches against each other produces confident nonsense.
 */
const isSubsequence = (needle: string, haystack: string): boolean => {
  let at = 0

  for (const character of haystack) {
    if (character === needle[at]) {
      at += 1

      if (at === needle.length) {
        return true
      }
    }
  }

  return needle.length === 0
}

/**
 * The matching icons, best first.
 *
 * Ties break on name length and then alphabetically. Length matters more than it
 * sounds: dozens of icons share the tag "delete", and sorting those
 * alphabetically buried `trash` behind `backspace` and `calendar-minus`. The
 * shorter name is the more generic icon, and the generic one is what someone
 * typing a single word is after. Alphabetical order is the final tie-break so
 * the same query always produces the same grid, otherwise the icon under the
 * cursor moves between renders.
 */
export const searchIcons = (
  entries: ReadonlyArray<IconEntry>,
  query: string,
): Array<IconEntry> => {
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return [...entries]
  }

  return entries
    .map((entry) => ({ entry, score: scoreIcon(entry, needle) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }

      if (a.entry.name.length !== b.entry.name.length) {
        return a.entry.name.length - b.entry.name.length
      }

      return a.entry.name.localeCompare(b.entry.name)
    })
    .map(({ entry }) => entry)
}
