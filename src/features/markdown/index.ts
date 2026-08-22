/**
 * The Markdown codec.
 *
 * Import from here: the split between the format's vocabulary, the reader and
 * the writer is an implementation detail, and the two directions must always be
 * used as a pair.
 */
export { serializeDocument, serializeInline } from './serialize'
export { applyMarkdown, parseDocument } from './parse'
export { sectionKindFromTitle } from './spec'
export type { ParseResult, ParseWarning } from './parse'
