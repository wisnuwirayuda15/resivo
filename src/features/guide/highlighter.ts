import { createHighlightJsAdapter } from '@mantine/code-highlight'
import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'

/**
 * The highlighter behind the guide's snippets.
 *
 * `highlight.js` rather than Shiki, which is the other adapter Mantine ships.
 * Shiki is a WASM engine that loads grammars and themes at runtime, and this
 * needs two grammars for a handful of static snippets — so it would be a large
 * asynchronous dependency to colour thirty lines of example code.
 *
 * Built from `highlight.js/lib/core` with exactly the two languages registered,
 * not the default bundle. The full build carries around 190 grammars; these two
 * are about a tenth of the size of the core alone, and nothing here will ever
 * ask for Perl.
 *
 * The whole module is only reached through the lazily loaded drawer, so a
 * session that never opens the guide never downloads any of it.
 */

hljs.registerLanguage('css', css)
hljs.registerLanguage('markdown', markdown)

export const guideHighlighter = createHighlightJsAdapter(hljs)
