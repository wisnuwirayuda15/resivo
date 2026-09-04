import { parse } from 'postcss'
import safeParser from 'postcss-safe-parser'

import type { AtRule, ChildNode, Container, Declaration, Rule } from 'postcss'

/**
 * The custom-CSS sanitizer.
 *
 * User CSS is injected into the preview iframe inside `@layer custom`, the
 * highest layer, so it can restyle anything the template drew. That is the
 * feature. This is what stands between it and the four things it must not do.
 *
 * **Reach the network.** Resivo is local-first: nothing about a resume should
 * ever leave the machine. `@import` and any `url()` that is not `data:` or
 * `blob:` would fetch (and therefore announce) on every render, which is a
 * privacy hole disguised as a font.
 *
 * **Escape its layer.** The stylesheet is assembled by wrapping this text in
 * `@layer custom { … }`. An unbalanced brace would close that block early and
 * drop everything after it into the *unlayered* origin, which outranks every
 * layer, including the page geometry the paginator measures against. The output
 * here is re-emitted from a parsed tree rather than passed through, so its braces
 * are balanced by construction, not by inspection.
 *
 * **Redefine the page.** `@page` sets the printed sheet, and `position: fixed`
 * takes an element out of the page box entirely. Both would make the printed
 * document disagree with the paginated preview, which is the one guarantee the
 * whole preview engine exists to provide.
 *
 * **Run anything.** `expression()`, `behavior` and `-moz-binding` are the old
 * routes from a stylesheet to script execution. Long dead in current browsers,
 * cheap to refuse, and this text may be read by something other than the browser
 * it was written in, an exported HTML file opened years from now.
 *
 * The parsing is PostCSS's. It used to be a hand-rolled tokenizer, for a good
 * reason (the hard cases are all about context: a brace inside a string, a
 * semicolon inside `url()`, a comment that hides either), but that is an
 * argument for a real parser, not for writing one here. A sanitizer is the last
 * place to keep a bespoke tokenizer, because every bypass it will ever have is a
 * disagreement between how it reads CSS and how the browser does.
 *
 * Only the policy below is ours. The output is still assembled by hand, in one
 * canonical shape, from nodes that have already been vetted.
 */

export interface CssWarning {
  /** 1-based, as editors count. */
  line: number
  column: number
  message: string
}

export interface SanitizeResult {
  /** Safe to inject. Balanced, and free of everything listed above. */
  css: string
  warnings: Array<CssWarning>
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * At-rules that may appear, and whether their block holds declarations or more
 * rules. Anything absent is refused, an allow-list, because the list of
 * at-rules grows with the platform and a deny-list would silently admit the next
 * one.
 */
const AT_RULES: Record<string, 'declarations' | 'rules'> = {
  media: 'rules',
  supports: 'rules',
  container: 'rules',
  scope: 'rules',
  keyframes: 'rules',
  'font-face': 'declarations',
  'counter-style': 'declarations',
  property: 'declarations',
  'font-feature-values': 'declarations',
}

/** Refused with a reason, so the editor can say why rather than just removing
 * the line. */
const REFUSED_AT_RULES: Record<string, string> = {
  import: '@import would fetch over the network. Paste the rules instead.',
  charset: '@charset has no effect here; the preview is always UTF-8.',
  namespace: '@namespace has no effect on the resume.',
  page: '@page is owned by the paper size and margins in the Style panel.',
  layer:
    '@layer is set by the preview; custom CSS is already in the top-most layer.',
  document: '@document is not supported by browsers.',
}

/** Properties refused outright. */
const REFUSED_PROPERTIES: Record<string, string> = {
  behavior: 'behavior can execute script.',
  '-moz-binding': '-moz-binding can execute script.',
}

/** Position values that would take an element out of the page box, and with it
 * out of the flow the paginator measured. */
const REFUSED_POSITIONS = new Set(['fixed', 'sticky'])

/** The only URL schemes that stay on the machine. A bare relative URL is refused
 * too: inside a `srcdoc` iframe it resolves against the parent document, so it
 * would reach for the app's own assets. */
const ALLOWED_URL = /^(?:data:|blob:|#)/i

const REMOTE_URL_MESSAGE =
  'Only data: and blob: URLs are allowed, a remote URL would fetch over the network.'

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const URL_PATTERN = /url\(\s*("([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi

/** Whether every `url()` in a value points somewhere that stays local. */
const urlsAreLocal = (value: string): boolean => {
  for (const match of value.matchAll(URL_PATTERN)) {
    const target = (match[2] ?? match[3] ?? match[4] ?? '').trim()

    if (!ALLOWED_URL.test(target)) {
      return false
    }
  }

  return true
}

const hasExpression = (value: string): boolean =>
  /expression\s*\(/i.test(value) || /javascript\s*:/i.test(value)

// ---------------------------------------------------------------------------
// Walking
// ---------------------------------------------------------------------------

interface Context {
  warnings: Array<CssWarning>
}

const warn = (context: Context, node: ChildNode, message: string): void => {
  const start = node.source?.start

  context.warnings.push({
    line: start?.line ?? 1,
    column: start?.column ?? 1,
    message,
  })
}

/**
 * The declarations of one block, in the order they were written.
 *
 * Anything that is not a declaration is refused here rather than descended into:
 * a rule nested inside another rule is either CSS nesting, which this build does
 * not support, or an attempt to close the enclosing layer early, and refusing
 * both is what keeps a brace from ever reaching the output through a
 * declaration.
 */
const declarations = (
  container: Container,
  context: Context,
): Array<string> => {
  const kept: Array<string> = []

  container.each((node) => {
    if (node.type === 'comment') {
      // Dropped rather than kept: a comment can hold anything, and nothing
      // downstream reads them.
      return
    }

    if (node.type !== 'decl') {
      warn(context, node, 'Nested rules are not supported here.')
      return
    }

    const declaration: Declaration = node
    const property = declaration.prop.trim()
    const value = declaration.value.trim()

    /**
     * `color: ;`, a property that was opened and then not given a value. Worth
     * saying out loud, because it is invisible in the preview and the rest of
     * the block around it still applies.
     *
     * A declaration with no colon at all never reaches here: the recovering
     * parser drops it, and the strict pass reports it by name and column.
     */
    if (value === '') {
      warn(context, node, 'Not a declaration; expected "property: value".')
      return
    }

    const refused = REFUSED_PROPERTIES[property.toLowerCase()]

    if (refused !== undefined) {
      warn(context, node, refused)
      return
    }

    if (hasExpression(value)) {
      warn(context, node, 'This value could execute script.')
      return
    }

    if (!urlsAreLocal(value)) {
      warn(context, node, REMOTE_URL_MESSAGE)
      return
    }

    if (
      property.toLowerCase() === 'position' &&
      REFUSED_POSITIONS.has(value.toLowerCase())
    ) {
      warn(
        context,
        node,
        `position: ${value} would take the element out of the page, so the print would not match the preview.`,
      )
      return
    }

    kept.push(`${property}: ${value}`)
  })

  return kept
}

const atRule = (node: AtRule, context: Context): string | undefined => {
  const name = node.name.toLowerCase()
  const refused = REFUSED_AT_RULES[name]

  if (refused !== undefined) {
    warn(context, node, refused)
    return undefined
  }

  const kind = AT_RULES[name]

  if (kind === undefined) {
    warn(context, node, `"@${name}" is not supported here.`)
    return undefined
  }

  if (node.nodes === undefined) {
    // A statement at-rule with no block, and nothing this build honours as one.
    warn(context, node, `"@${name}" needs a block.`)
    return undefined
  }

  const prelude = `@${node.name}${node.params === '' ? '' : ` ${node.params}`}`

  if (!urlsAreLocal(node.params)) {
    warn(context, node, REMOTE_URL_MESSAGE)
    return undefined
  }

  const body =
    kind === 'declarations'
      ? declarations(node, context).join('; ')
      : statements(node, context).join('\n')

  // An at-rule whose body is entirely refused is dropped rather than emitted
  // empty, so the output stays readable when inspected.
  return body === '' ? undefined : `${prelude} { ${body} }`
}

const rule = (node: Rule, context: Context): string | undefined => {
  const selector = node.selector.trim()

  if (selector === '') {
    warn(context, node, 'A rule needs a selector.')
    return undefined
  }

  const body = declarations(node, context).join('; ')

  return body === '' ? undefined : `${selector} { ${body} }`
}

const statements = (container: Container, context: Context): Array<string> => {
  const out: Array<string> = []

  container.each((node) => {
    if (node.type === 'comment') {
      return
    }

    if (node.type === 'decl') {
      // A declaration where a rule belongs, outside any block.
      warn(context, node, 'Expected "{" after the selector.')
      return
    }

    const emitted =
      node.type === 'atrule' ? atRule(node, context) : rule(node, context)

    if (emitted !== undefined) {
      out.push(emitted)
    }
  })

  return out
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Parses twice, on purpose.
 *
 * The strict parser is run first only for its diagnostics: it reports an
 * unbalanced brace or an unclosed block with a position, which is exactly what
 * the author needs to see and what a recovering parser silently swallows. The
 * recovering parser then does the parse that is actually used, because
 * discarding somebody's whole stylesheet over one typo would be hostile, a
 * browser keeps going too, and so should this.
 *
 * Both are cheap: a resume's custom CSS is a few dozen rules, and this already
 * runs debounced behind the editor.
 */
const diagnose = (source: string, context: Context): void => {
  try {
    parse(source, { from: undefined })
  } catch (error) {
    const syntax = error as { line?: number; column?: number; reason?: string }

    context.warnings.push({
      line: syntax.line ?? 1,
      column: syntax.column ?? 1,
      message:
        syntax.reason === undefined
          ? 'This is not valid CSS; the rules that could be read were kept.'
          : `${syntax.reason}. The rules that could be read were kept.`,
    })
  }
}

export const sanitizeCss = (source: string): SanitizeResult => {
  const context: Context = { warnings: [] }

  diagnose(source, context)

  const root = safeParser(source, { from: undefined })
  const rules = statements(root, context)

  // Warnings are collected in two passes, so the syntax diagnostic can arrive
  // before a policy warning that is earlier in the file.
  context.warnings.sort((left, right) =>
    left.line === right.line
      ? left.column - right.column
      : left.line - right.line,
  )

  return { css: rules.join('\n'), warnings: context.warnings }
}
