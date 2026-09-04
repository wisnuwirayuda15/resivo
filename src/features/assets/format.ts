/**
 * Formatting shared by every surface that lists an asset.
 *
 * Extracted from `AssetsPanel` when the standalone Images and Fonts pages were
 * built: two implementations of "how big is this file" would eventually disagree
 * about where the megabyte boundary is.
 */

export const formatBytes = (bytes: number): string =>
  bytes < 1024
    ? // Below a kilobyte, rounding to KB reports "0 KB" for a file that plainly
      // exists, which reads as a failed upload.
      `${bytes} B`
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

/** The message from a rejected upload, which is written for the user. Anything
 * else is unexpected, so it is shown verbatim rather than paraphrased. */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
