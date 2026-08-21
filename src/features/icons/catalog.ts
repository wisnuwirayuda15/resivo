/**
 * The icon catalog: 1512 names, their search terms, and their glyphs.
 *
 * Loaded lazily. The data is ~730KB of markup and words, which is the right
 * price for a picker someone opens occasionally and the wrong one for an app
 * entry point — so `loadIconCatalog` fetches it on first use and everything
 * afterwards is synchronous.
 *
 * Nothing here reflects over the icon package at runtime. The catalog is
 * generated and committed (see `scripts/generate-icon-catalog.mjs`), so the set
 * of icons a build ships is fixed at build time and a document that names one
 * cannot depend on what happens to be installed.
 */

export interface IconEntry {
  /** Kebab-case, as the document model stores it. */
  name: string
  /** Tags and categories, lowercased and space-joined. */
  terms: string
  /** The SVG children — paths and shapes — of the regular weight. */
  body: string
}

export interface IconCatalog {
  entries: Array<IconEntry>
  byName: Map<string, IconEntry>
}

export const parseCatalog = (source: string): IconCatalog => {
  const entries = source
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [name = '', terms = '', body = ''] = line.split('\t')

      return { name, terms, body }
    })

  return { entries, byName: new Map(entries.map((e) => [e.name, e])) }
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

let catalog: IconCatalog | null = null
let pending: Promise<IconCatalog> | null = null

/** Notified when the catalog arrives, so anything already rendered — the paper,
 * above all — can draw the glyphs it had to leave as reserved space. */
const listeners = new Set<() => void>()

export const loadIconCatalog = (): Promise<IconCatalog> => {
  if (catalog !== null) {
    return Promise.resolve(catalog)
  }

  // One request no matter how many components ask at once: the picker and the
  // preview both want it, and they mount together.
  pending ??= import('./catalog.gen').then((module) => {
    catalog = parseCatalog(module.ICON_CATALOG_SOURCE)
    pending = null

    for (const listener of listeners) {
      listener()
    }

    return catalog
  })

  return pending
}

/** The catalog if it is already here, `null` otherwise. Synchronous, for a
 * render that cannot wait. */
export const loadedIconCatalog = (): IconCatalog | null => catalog

export const onIconCatalogLoaded = (listener: () => void): (() => void) => {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

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
   * `envelope` — tagged "mail" — is what someone wants, and `voicemail` is not,
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
 * "envelope". Deliberately unscored beyond a flat 100 — ranking scattered
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
 * the same query always produces the same grid — otherwise the icon under the
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
