import { z } from "zod";

import { LocalizedError } from "@/lib/i18n/LocalizedError";

/**
 * The resume bundle's shape.
 *
 * A bundle is one resume with everything it needs to look the same somewhere
 * else: the document with its template, tokens and custom CSS, and the images
 * and fonts it uses as the files they are. The whole-device backup is the
 * other way to leave this app, and it is JSON with base64 assets so a person can
 * read what leaves their machine. A zip is the right trade here, because it is
 * written to be moved between devices, the assets are not inflated by a third,
 * and the file opens in any archive tool.
 *
 * ```
 * manifest.json       what this is, and which template revision drew it
 * resume.json         the title, the document, and metadata for each asset
 * images/<name>       the bytes as they were stored
 * fonts/<name>        likewise
 * resume.md           a readable copy, never read back
 * ```
 */

export const BUNDLE_KIND = "resivo.resume";
export const BUNDLE_VERSION = 1;

/**
 * Limits, checked against what each entry *declares* before anything is
 * inflated. A zip is untrusted input, and a few kilobytes of it can claim to
 * hold gigabytes, so the sizes in the central directory are what is trusted to
 * refuse it, and the inflater is only ever given a buffer of the declared size.
 *
 * The per-entry figure is the largest asset the app itself accepts (an image,
 * 8 MiB) with room for a document, and the total is what a resume with a dozen
 * photographs and a font family could honestly come to.
 */
export const BUNDLE_LIMITS = {
  totalBytes: 100 * 1024 * 1024,
  entryBytes: 25 * 1024 * 1024,
  entries: 500,
} as const;

/** The only names that are read, so what an archive calls its files never
 * becomes a path: nothing here is ever used to address anything but a key into
 * the entries this module itself looked up. */
export const ASSET_PATH =
  /^(?:images|fonts)\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,160}$/;

/** `PK`, the first two bytes of every zip. Here, and not beside the reader,
 * because the dialog asks it of every file it is given and must not load the
 * zip library to do so. */
export const looksLikeZip = (head: Uint8Array): boolean =>
  head[0] === 0x50 && head[1] === 0x4b;

export const MANIFEST_FILE = "manifest.json";
export const RESUME_FILE = "resume.json";
export const MARKDOWN_FILE = "resume.md";

export const manifestSchema = z.object({
  kind: z.literal(BUNDLE_KIND),
  version: z.number().int().positive(),
  createdAt: z.number(),
  /**
   * The template revision that drew the document. "Looks the same" holds while
   * the app that reads it has the same CSS for that template, and this is how an
   * import can say when it does not.
   */
  template: z.object({ id: z.string(), version: z.number().int() }),
});

const imageMetaSchema = z.object({
  id: z.string().min(1).max(128),
  /** Where the bytes are, relative to the archive root. */
  file: z.string().regex(ASSET_PATH),
  name: z.string().max(512),
  mime: z.string().max(100),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  /** SHA-256 of the bytes, checked on the way in. */
  hash: z.string().length(64),
});

const fontMetaSchema = z.object({
  id: z.string().min(1).max(128),
  file: z.string().regex(ASSET_PATH),
  family: z.string().min(1).max(200),
  weight: z.number().int().min(1).max(1000),
  style: z.enum(["normal", "italic"]),
  format: z.enum(["woff2", "woff", "ttf", "otf"]),
});

export const resumeFileSchema = z.object({
  title: z.string().max(512),
  /** Validated by `migrateDocument` and `documentSchema`, which know how, and
   * which a document from an older build has to go through first. */
  document: z.unknown(),
  images: z.array(imageMetaSchema).max(BUNDLE_LIMITS.entries),
  fonts: z.array(fontMetaSchema).max(BUNDLE_LIMITS.entries),
});

export type BundleManifest = z.infer<typeof manifestSchema>;
export type BundleImageMeta = z.infer<typeof imageMetaSchema>;
export type BundleFontMeta = z.infer<typeof fontMetaSchema>;
export type BundleResumeFile = z.infer<typeof resumeFileSchema>;

/** A refusal that carries the key of its own words, like `BackupRejected`. */
export class BundleRejected extends LocalizedError {}
