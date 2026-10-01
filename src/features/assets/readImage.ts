/**
 * Turning a picked file into something the images table can hold.
 *
 * The checks here are about what the paper can render and what the device can
 * afford to keep, not about trust: a blob only ever reaches an `<img>` inside a
 * sandboxed iframe that cannot run scripts. Every rejection is a message the
 * user sees, so each says what to do about it.
 */

import { LocalizedError } from "@/lib/i18n/LocalizedError";

import type { AddImageInput } from "@/database/repositories/images";

/**
 * Raster formats only. SVG is refused deliberately: it has no intrinsic pixel
 * size to reserve a layout box from, it can carry its own fonts and scripts, and
 * it would be the one asset in the app whose contents are markup rather than
 * bytes.
 */
const ACCEPTED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const IMAGE_ACCEPT = [...ACCEPTED].join(",");

/**
 * 8MB. Photographs on a resume are printed at most a couple of inches wide, so
 * anything larger is a full-resolution camera file that would bloat every backup
 * of this document for no visible gain.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * A refusal, as an error that carries the key of its own words. `message` is
 * the English sentence a log or a test reads; the screen that shows it chooses
 * the words by `key`, in the language it is in.
 */
export class AssetRejected extends LocalizedError {}

const megabytes = (bytes: number): string =>
  `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;

/**
 * Reads the intrinsic size.
 *
 * `createImageBitmap` both measures and decodes, so a file that is named like an
 * image but is not one fails here rather than later as a broken box on the
 * paper. The bitmap is closed immediately, it holds decoded pixels, which for a
 * large photo is far more memory than the file itself.
 */
const measure = async (
  blob: Blob,
): Promise<{ width: number; height: number }> => {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new AssetRejected(
      "That file could not be decoded as an image. It may be corrupt, or named " +
        "with an extension that does not match its contents.",
      "assets:rejected.image.notDecodable",
    );
  }

  const { width, height } = bitmap;

  bitmap.close();

  return { width, height };
};

export const readImageFile = async (file: File): Promise<AddImageInput> => {
  if (!ACCEPTED.has(file.type)) {
    throw new AssetRejected(
      `${file.type === "" ? "That file" : file.type} is not a supported image. ` +
        "Use PNG, JPEG, WebP or GIF.",
      file.type === ""
        ? "assets:rejected.image.unsupportedUnknown"
        : "assets:rejected.image.unsupported",
      { type: file.type },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new AssetRejected(
      `That image is ${megabytes(file.size)}. The limit is ` +
        `${megabytes(MAX_IMAGE_BYTES)}, export a smaller copy, since a resume ` +
        "prints it a few inches wide at most.",
      "assets:rejected.image.tooLarge",
      { size: megabytes(file.size), limit: megabytes(MAX_IMAGE_BYTES) },
    );
  }

  const { width, height } = await measure(file);

  return {
    // The extension is noise in a gallery that already shows a thumbnail.
    name: file.name.replace(/\.[^.]+$/, "") || file.name,
    blob: file,
    width,
    height,
  };
};
