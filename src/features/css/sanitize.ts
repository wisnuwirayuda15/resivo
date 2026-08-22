/**
 * The custom-CSS sanitizer.
 *
 * User CSS is injected into the preview iframe inside `@layer custom`, the
 * highest layer, so it can restyle anything the template drew. That is the
 * feature. This is what stands between it and the four things it must not do.
 *
 * **Reach the network.** Resivo is local-first: nothing about a resume should
 * ever leave the machine. `@import` and any `url()` that is not `data:` or
 * `blob:` would fetch — and therefore announce — on every render, which is a
 * privacy hole disguised as a font.
 *
 * **Escape its layer.** The stylesheet is assembled by wrapping this text in
 * `@layer custom { … }`. An unbalanced brace would close that block early and
 * drop everything after it into the *unlayered* origin, which outranks every
 * layer — including the page geometry the paginator measures against. The output
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
 * it was written in — an exported HTML file opened years from now.
 *
 * Written as a tokenizer rather than a set of regular expressions because the
 * hard cases are all about context: a brace inside a string, a semicolon inside
 * `url()`, a comment that hides either. A pattern that ignores context is a
 * pattern that can be walked around.
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
 * rules. Anything absent is refused — an allow-list, because the list of
 * at-rules grows with the platform and a deny-list would silently admit the next
 * one.
 */
const AT_RULES: Record<string, 'declarations' | 'rules' | 'none'> = {
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

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

class Reader {
  private readonly lineStarts: Array<number>

  constructor(
    readonly source: string,
    public index = 0,
  ) {
    this.lineStarts = [0]

    for (let at = 0; at < source.length; at += 1) {
      if (source[at] === '\n') {
        this.lineStarts.push(at + 1)
      }
    }
  }

  get done(): boolean {
    return this.index >= this.source.length
  }

  peek(offset = 0): string {
    return this.source[this.index + offset] ?? ''
  }

  /** Line and column of an offset, for a warning. */
  positionOf(offset: number): { line: number; column: number } {
    let low = 0
    let high = this.lineStarts.length - 1

    while (low < high) {
      const middle = Math.ceil((low + high) / 2)

      if ((this.lineStarts[middle] ?? 0) <= offset) {
        low = middle
      } else {
        high = middle - 1
      }
    }

    return { line: low + 1, column: offset - (this.lineStarts[low] ?? 0) + 1 }
  }

  /** Advances past whitespace and comments. Comments are dropped rather than
   * kept: they can hold anything, and nothing downstream reads them. */
  skipTrivia(): void {
    for (;;) {
      const character = this.peek()

      if (character === '') {
        return
      }

      if (/\s/.test(character)) {
        this.index += 1
        continue
      }

      if (character === '/' && this.peek(1) === '*') {
        const close = this.source.indexOf('*/', this.index + 2)

        // An unterminated comment swallows the rest of the file, which is what a
        // browser does too.
        this.index = close === -1 ? this.source.length : close + 2
        continue
      }

      return
    }
  }

  /** Reads one token's worth of raw text, keeping strings, comments and nested
   * brackets intact, until one of `stops` is reached at depth zero. */
  readUntil(stops: string): string {
    const start = this.index
    let depth = 0

    while (!this.done) {
      const character = this.peek()

      if (character === '"' || character === "'") {
        this.skipString()
        continue
      }

      if (character === '/' && this.peek(1) === '*') {
        const close = this.source.indexOf('*/', this.index + 2)

        this.index = close === -1 ? this.source.length : close + 2
        continue
      }

      if (character === '(' || character === '[') {
        depth += 1
      } else if (character === ')' || character === ']') {
        depth = Math.max(0, depth - 1)
      } else if (depth === 0 && stops.includes(character)) {
        break
      }

      this.index += 1
    }

    return this.source.slice(start, this.index)
  }

  private skipString(): void {
    const quote = this.peek()

    this.index += 1

    while (!this.done) {
      const character = this.peek()

      if (character === '\\') {
        this.index += 2
        continue
      }

      this.index += 1

      if (character === quote || character === '\n') {
        return
      }
    }
  }

  /** Skips a `{ … }` block, wherever the cursor is inside it. */
  skipBlock(): void {
    let depth = 0

    while (!this.done) {
      this.readUntil('{}')

      const character = this.peek()

      if (character === '{') {
        depth += 1
      } else if (character === '}') {
        depth -= 1
      } else {
        return
      }

      this.index += 1

      if (depth === 0) {
        return
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/**
 * Removes comments from a captured span, and reports whether it contains a
 * brace outside a string.
 *
 * Both answers come from the same pass because both need the same context. A
 * comment can hide anything, and a brace in a declaration means either CSS
 * nesting — which the model's own stylesheet does not use and which this build
 * does not support — or an attempt to close the enclosing layer early. Either
 * way the declaration is dropped, so no brace can ever reach the output from
 * here.
 */
const clean = (raw: string): { text: string; brace: boolean } => {
  let text = ''
  let brace = false
  let at = 0

  while (at < raw.length) {
    const character = raw[at] ?? ''

    if (character === '"' || character === "'") {
      text += character
      at += 1

      while (at < raw.length) {
        const inner = raw[at] ?? ''

        if (inner === '\\') {
          text += raw.slice(at, at + 2)
          at += 2
          continue
        }

        text += inner
        at += 1

        if (inner === character) {
          break
        }
      }

      continue
    }

    if (character === '/' && raw[at + 1] === '*') {
      const close = raw.indexOf('*/', at + 2)

      at = close === -1 ? raw.length : close + 2
      continue
    }

    if (character === '{' || character === '}') {
      brace = true
    }

    text += character
    at += 1
  }

  return { text, brace }
}
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
// Parsing
// ---------------------------------------------------------------------------

interface Context {
  reader: Reader
  warnings: Array<CssWarning>
}

const warn = (context: Context, offset: number, message: string): void => {
  context.warnings.push({ ...context.reader.positionOf(offset), message })
}

/** Splits a block's body into declarations, then keeps the allowed ones. */
const declarations = (context: Context, end: number): Array<string> => {
  const { reader } = context
  const kept: Array<string> = []

  while (reader.index < end) {
    reader.skipTrivia()

    if (reader.index >= end) {
      break
    }

    const start = reader.index
    const captured = reader.readUntil(';}')

    // Step over the terminator, if there is one before the block's end.
    if (reader.peek() === ';') {
      reader.index += 1
    }

    const { text, brace } = clean(captured)
    const raw = text.trim()

    if (raw === '') {
      continue
    }

    if (brace) {
      // Either CSS nesting, which this build does not support, or an attempt to
      // close the enclosing layer early. Refusing both is what guarantees no
      // brace ever reaches the output from a declaration.
      warn(context, start, 'Nested rules are not supported here.')
      continue
    }

    const colon = raw.indexOf(':')

    if (colon === -1) {
      warn(context, start, 'Not a declaration; expected "property: value".')
      continue
    }

    const property = raw.slice(0, colon).trim().toLowerCase()
    const value = raw.slice(colon + 1).trim()

    const refused = REFUSED_PROPERTIES[property]

    if (refused !== undefined) {
      warn(context, start, refused)
      continue
    }

    if (hasExpression(value)) {
      warn(context, start, 'This value could execute script.')
      continue
    }

    if (!urlsAreLocal(value)) {
      warn(
        context,
        start,
        'Only data: and blob: URLs are allowed — a remote URL would fetch over the network.',
      )
      continue
    }

    if (property === 'position' && REFUSED_POSITIONS.has(value.toLowerCase())) {
      warn(
        context,
        start,
        `position: ${value} would take the element out of the page, so the print would not match the preview.`,
      )
      continue
    }

    kept.push(`${raw.slice(0, colon).trim()}: ${value}`)
  }

  reader.index = end

  return kept
}

/** Finds the offset of the `}` closing the block that starts at the cursor's
 * `{`, so the body can be parsed within known bounds. */
const blockEnd = (reader: Reader): number => {
  const restore = reader.index

  reader.skipBlock()

  const end = reader.index
  reader.index = restore

  // One before the closing brace: the body, not the brace.
  return Math.max(restore, end - 1)
}

const parseStatements = (context: Context, limit: number): Array<string> => {
  const { reader } = context
  const out: Array<string> = []

  while (reader.index < limit) {
    reader.skipTrivia()

    if (reader.index >= limit) {
      break
    }

    const start = reader.index

    // A stray closing brace at this level: the user's braces do not balance.
    // Stepping over it is what keeps the rest of the sheet usable.
    if (reader.peek() === '}') {
      reader.index += 1
      warn(context, start, 'Unmatched "}".')
      continue
    }

    const prelude = reader.readUntil('{;').trim()
    const terminator = reader.peek()

    if (prelude.startsWith('@')) {
      const name = (/^@([\w-]+)/.exec(prelude)?.[1] ?? '').toLowerCase()
      const refused = REFUSED_AT_RULES[name]
      const allowed = AT_RULES[name]

      if (terminator === ';') {
        reader.index += 1
      }

      if (refused !== undefined) {
        warn(context, start, refused)

        if (terminator === '{') {
          reader.skipBlock()
        }

        continue
      }

      if (allowed === undefined) {
        warn(context, start, `"@${name}" is not supported here.`)

        if (terminator === '{') {
          reader.skipBlock()
        }

        continue
      }

      if (terminator !== '{') {
        // A statement at-rule with no block and nothing this build honours.
        warn(context, start, `"@${name}" needs a block.`)
        continue
      }

      if (!urlsAreLocal(prelude)) {
        warn(
          context,
          start,
          'Only data: and blob: URLs are allowed — a remote URL would fetch over the network.',
        )
        reader.skipBlock()
        continue
      }

      const end = blockEnd(reader)
      reader.index += 1

      const body =
        allowed === 'declarations'
          ? declarations(context, end).join('; ')
          : parseStatements(context, end).join('\n')

      reader.index = end + 1

      // An at-rule whose body is entirely refused is dropped rather than
      // emitted empty, so the output stays readable when inspected.
      if (body !== '') {
        out.push(`${prelude} { ${body} }`)
      }

      continue
    }

    if (terminator !== '{') {
      // A selector with no block: everything up to the next `;` is not CSS.
      if (terminator === ';') {
        reader.index += 1
      }

      if (prelude !== '') {
        warn(context, start, 'Expected "{" after the selector.')
      }

      continue
    }

    const end = blockEnd(reader)
    reader.index += 1

    const body = declarations(context, end).join('; ')

    reader.index = end + 1

    if (prelude === '') {
      warn(context, start, 'A rule needs a selector.')
      continue
    }

    if (body !== '') {
      out.push(`${prelude} { ${body} }`)
    }
  }

  return out
}

export const sanitizeCss = (source: string): SanitizeResult => {
  const reader = new Reader(source)
  const context: Context = { reader, warnings: [] }
  const rules = parseStatements(context, source.length)

  return { css: rules.join('\n'), warnings: context.warnings }
}
