/**
 * The canonical resume document model.
 *
 * Import from here rather than reaching into the individual modules, the split
 * between types, runtime schema and constructors is an implementation detail.
 */
export * from "./document";
export * from "./factory";
export { documentSchema } from "./schema";
export type { ParsedDocument } from "./schema";
