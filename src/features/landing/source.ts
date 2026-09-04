/**
 * The Markdown shown in the hero.
 *
 * Real syntax, checked against the real parser in `source.test.ts`. A landing
 * page that invents plausible-looking syntax is a landing page that teaches the
 * wrong thing to the first person who copies it, and the failure mode of a
 * screenshot is that nobody ever finds out.
 *
 * Short on purpose: it has to be readable at 11px next to the page it produces,
 * so it shows the two shapes that are not ordinary Markdown (a contact and an
 * entry) and stops.
 */
export const HERO_SOURCE = `# Ada Lovelace

Mathematician, and the first programmer

::contact[ada@example.com]{icon="envelope"}
::contact[London, UK]{icon="map-pin"}

## Experience

:::entry{title="Analyst" subtitle="Difference Engine Co." start="1842-10" current="true"}
Notes on the Analytical Engine, with the first published algorithm.

- Translated Menabrea's memoir, then tripled it in footnotes
:::
`

/** How a line is coloured. The whole highlighter, because two kinds is enough
 * to show that the directives are not prose. */
export type SourceLineKind = 'heading' | 'directive' | 'text'

export const sourceLineKind = (line: string): SourceLineKind => {
  if (line.startsWith('#')) {
    return 'heading'
  }

  return line.startsWith('::') || line === ':::' ? 'directive' : 'text'
}
