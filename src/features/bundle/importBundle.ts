import { strFromU8, unzipSync } from "fflate";

import { getDb } from "@/database/db";
import { migrateDocument } from "@/database/migrations/documents";
import { resumeRepo } from "@/database/index";
import { readFontFile } from "@/features/assets/readFont";
import { readImageFile } from "@/features/assets/readImage";
import { remapAssets } from "@/features/backup/backup";
import { resolveTemplate } from "@/features/templates/registry";
import { createId } from "@/lib/id";
import { hashBlob } from "@/lib/hash";

import {
  ASSET_PATH,
  BUNDLE_LIMITS,
  BUNDLE_VERSION,
  BundleRejected,
  MANIFEST_FILE,
  RESUME_FILE,
  manifestSchema,
  resumeFileSchema,
} from "./format";

import type {
  FontRecord,
  ImageRecord,
  ResumeRecord,
  ResumeTarget,
} from "@/database/records";
import type { ResumeDocument } from "@/features/resume/model/document";
import type { BundleFontMeta, BundleImageMeta } from "./format";

/**
 * Reading a bundle, and putting it on this device.
 *
 * Two steps, and the line between them is the point. `readResumeBundle` does
 * everything that can refuse a file (the archive, the sizes, the manifest, the
 * document, every image and font) and writes nothing. `restoreResumeBundle`
 * then only writes, from values already checked. A bundle that is wrong in any
 * way therefore costs the person a message and no data, and a bundle that is
 * right cannot half-arrive because the tenth image failed to decode.
 */

/** The reader for an asset, injectable because decoding an image needs a
 * browser, and the tests that exercise everything around it do not have one. */
export interface BundleReaders {
  image: typeof readImageFile;
  font: typeof readFontFile;
}

const DEFAULT_READERS: BundleReaders = {
  image: readImageFile,
  font: readFontFile,
};

export interface ParsedImage {
  meta: BundleImageMeta;
  blob: Blob;
  /** Recomputed from the bytes, never taken from the file. */
  hash: string;
}

export interface ParsedFont {
  meta: BundleFontMeta;
  blob: Blob;
}

export interface ParsedBundle {
  title: string;
  target?: ResumeTarget;
  document: ResumeDocument;
  images: Array<ParsedImage>;
  fonts: Array<ParsedFont>;
  /**
   * Set when the template that drew this resume has changed since, which is the
   * one thing that can make the result differ from the original. Not an error:
   * the resume is complete and opens, it may just break a page differently.
   */
  templateChanged?: { from: number; to: number };
}

const megabytes = (bytes: number): string =>
  `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;

const parseJson = (bytes: Uint8Array | undefined, name: string): unknown => {
  if (bytes === undefined) {
    throw new BundleRejected(
      `The bundle has no ${name}.`,
      "library:bundle.rejected.missing",
      { name },
    );
  }

  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    throw new BundleRejected(
      `${name} in the bundle is not valid JSON.`,
      "library:bundle.rejected.unreadable",
      { detail: name },
    );
  }
};

/**
 * Unzips only what this module will use, refusing on the declared sizes first.
 *
 * `filter` runs against the central directory, before any entry is inflated, and
 * a throw from it stops the read. Everything not on the allow-list (the readable
 * `resume.md`, anything an archive tool added, anything with a path) returns
 * false and is never decompressed.
 */
const unzip = (bytes: Uint8Array): Record<string, Uint8Array> => {
  let entries = 0;
  let declared = 0;

  try {
    return unzipSync(bytes, {
      filter: ({ name, originalSize }) => {
        entries += 1;
        declared += originalSize;

        if (entries > BUNDLE_LIMITS.entries) {
          throw new BundleRejected(
            "The bundle holds more files than a resume could.",
            "library:bundle.rejected.tooManyEntries",
            { limit: BUNDLE_LIMITS.entries },
          );
        }

        if (declared > BUNDLE_LIMITS.totalBytes) {
          throw new BundleRejected(
            "The bundle unpacks to more than the limit.",
            "library:bundle.rejected.tooLarge",
            {
              size: megabytes(declared),
              limit: megabytes(BUNDLE_LIMITS.totalBytes),
            },
          );
        }

        const wanted =
          name === MANIFEST_FILE ||
          name === RESUME_FILE ||
          ASSET_PATH.test(name);

        if (!wanted) {
          return false;
        }

        if (originalSize > BUNDLE_LIMITS.entryBytes) {
          throw new BundleRejected(
            `${name} in the bundle is too large.`,
            "library:bundle.rejected.entryTooLarge",
            {
              name,
              size: megabytes(originalSize),
              limit: megabytes(BUNDLE_LIMITS.entryBytes),
            },
          );
        }

        return true;
      },
    });
  } catch (cause) {
    if (cause instanceof BundleRejected) {
      throw cause;
    }

    throw new BundleRejected(
      "That file is not a zip archive.",
      "library:bundle.rejected.notZip",
    );
  }
};

/**
 * Reads and validates a bundle without writing anything.
 *
 * Every failure is a sentence the person can act on, the same standard the
 * backup parser holds itself to.
 */
export const readResumeBundle = async (
  source: Blob,
  readers: BundleReaders = DEFAULT_READERS,
): Promise<ParsedBundle> => {
  if (source.size > BUNDLE_LIMITS.totalBytes) {
    throw new BundleRejected(
      "That file is larger than any resume bundle.",
      "library:bundle.rejected.tooLarge",
      {
        size: megabytes(source.size),
        limit: megabytes(BUNDLE_LIMITS.totalBytes),
      },
    );
  }

  const files = unzip(new Uint8Array(await source.arrayBuffer()));

  const manifest = manifestSchema.safeParse(
    parseJson(files[MANIFEST_FILE], MANIFEST_FILE),
  );

  if (!manifest.success) {
    throw new BundleRejected(
      "That zip is not a Resivo resume bundle.",
      "library:bundle.rejected.notBundle",
    );
  }

  if (manifest.data.version > BUNDLE_VERSION) {
    throw new BundleRejected(
      `That bundle was written by a newer version of Resivo (format ${manifest.data.version}, this build reads ${BUNDLE_VERSION}).`,
      "library:bundle.rejected.newer",
      { version: manifest.data.version, supported: BUNDLE_VERSION },
    );
  }

  const resumeFile = resumeFileSchema.safeParse(
    parseJson(files[RESUME_FILE], RESUME_FILE),
  );

  if (!resumeFile.success) {
    const first = resumeFile.error.issues[0];

    throw new BundleRejected(
      "The bundle's resume could not be read.",
      "library:bundle.rejected.unreadable",
      { detail: first === undefined ? RESUME_FILE : first.message },
    );
  }

  let document: ResumeDocument;

  try {
    // The step the whole-device backup does not take: a bundle is written to be
    // opened by a later build, so its document may be older than this one.
    document = migrateDocument(resumeFile.data.document).document;
  } catch (cause) {
    throw new BundleRejected(
      "The resume inside the bundle is not valid.",
      "library:bundle.rejected.document",
      { detail: cause instanceof Error ? cause.message : "" },
    );
  }

  const images: Array<ParsedImage> = [];

  for (const meta of resumeFile.data.images) {
    const bytes = files[meta.file];

    if (bytes === undefined) {
      throw new BundleRejected(
        `The bundle lists ${meta.file} but does not contain it.`,
        "library:bundle.rejected.missing",
        { name: meta.file },
      );
    }

    // The same reader an upload goes through: type, size and an actual decode.
    // A file that merely has an image's name is refused here.
    const file = new File([bytes as BlobPart], meta.name, { type: meta.mime });
    const read = await readers.image(file);
    const hash = await hashBlob(read.blob);

    if (hash !== meta.hash) {
      throw new BundleRejected(
        `${meta.file} does not match its recorded checksum.`,
        "library:bundle.rejected.corrupt",
        { name: meta.file },
      );
    }

    images.push({
      meta: { ...meta, width: read.width, height: read.height },
      blob: read.blob,
      hash,
    });
  }

  const fonts: Array<ParsedFont> = [];

  for (const meta of resumeFile.data.fonts) {
    const bytes = files[meta.file];

    if (bytes === undefined) {
      throw new BundleRejected(
        `The bundle lists ${meta.file} but does not contain it.`,
        "library:bundle.rejected.missing",
        { name: meta.file },
      );
    }

    const read = await readers.font(
      new File([bytes as BlobPart], `${meta.family}.${meta.format}`),
    );

    fonts.push({ meta: { ...meta, format: read.format }, blob: read.blob });
  }

  const current = resolveTemplate(document.templateId).version;

  return {
    title: resumeFile.data.title,
    ...(resumeFile.data.target === undefined
      ? {}
      : { target: resumeFile.data.target }),
    document,
    images,
    fonts,
    ...(manifest.data.template.version === current
      ? {}
      : {
          templateChanged: {
            from: manifest.data.template.version,
            to: current,
          },
        }),
  };
};

/** What restoring a bundle did, so the result is reported rather than assumed. */
export interface BundleRestoreReport {
  imagesAdded: number;
  /** The same bytes were already stored, matched on hash. */
  imagesAlreadyPresent: number;
  fontsAdded: number;
  fontsAlreadyPresent: number;
}

export interface RestoredBundle {
  resume: ResumeRecord;
  report: BundleRestoreReport;
}

/**
 * Stores a parsed bundle as a new resume.
 *
 * Never overwrites, and never reuses the id it came with: importing is adding,
 * and the same bundle imported twice is two resumes that share their images and
 * fonts, because assets are matched by content the way `restoreBackup` matches
 * them. The document's references are rewritten to the ids the assets have *here*.
 *
 * One transaction, so a failure part way leaves the database as it found it.
 * Everything that is not a database call (decoding, hashing) was done by
 * `readResumeBundle`, which is what makes a transaction possible: Dexie cannot
 * keep one open across an `await` on anything else.
 */
export const restoreResumeBundle = async (
  parsed: ParsedBundle,
  options: { title?: string; groupId?: string } = {},
): Promise<RestoredBundle> => {
  const db = getDb();
  const report: BundleRestoreReport = {
    imagesAdded: 0,
    imagesAlreadyPresent: 0,
    fontsAdded: 0,
    fontsAlreadyPresent: 0,
  };
  const imageIdMap = new Map<string, string>();
  const fontIdMap = new Map<string, string>();

  const resume = await db.transaction(
    "rw",
    [db.images, db.fonts, db.resumes, db.groups],
    async () => {
      for (const { meta, blob, hash } of parsed.images) {
        const existing = await db.images.where("hash").equals(hash).first();

        if (existing !== undefined) {
          imageIdMap.set(meta.id, existing.id);
          report.imagesAlreadyPresent += 1;
          continue;
        }

        const taken = await db.images.get(meta.id);
        const id = taken === undefined ? meta.id : createId();
        const record: ImageRecord = {
          id,
          name: meta.name,
          blob,
          mime: meta.mime,
          width: meta.width,
          height: meta.height,
          size: blob.size,
          hash,
          createdAt: Date.now(),
        };

        await db.images.add(record);
        imageIdMap.set(meta.id, id);
        report.imagesAdded += 1;
      }

      for (const { meta, blob } of parsed.fonts) {
        const existing = (
          await db.fonts.where("family").equals(meta.family).toArray()
        ).find(
          (candidate) =>
            candidate.weight === meta.weight && candidate.style === meta.style,
        );

        if (existing !== undefined) {
          fontIdMap.set(meta.id, existing.id);
          report.fontsAlreadyPresent += 1;
          continue;
        }

        const taken = await db.fonts.get(meta.id);
        const id = taken === undefined ? meta.id : createId();
        const record: FontRecord = {
          id,
          family: meta.family,
          weight: meta.weight,
          style: meta.style,
          format: meta.format,
          blob,
          size: blob.size,
          createdAt: Date.now(),
        };

        await db.fonts.add(record);
        fontIdMap.set(meta.id, id);
        report.fontsAdded += 1;
      }

      // A group that is not on this device would leave the resume filed where
      // the library cannot show it, so an unknown one means ungrouped.
      const groupId =
        options.groupId !== undefined &&
        (await db.groups.get(options.groupId)) !== undefined
          ? options.groupId
          : "";

      return resumeRepo.createResume({
        title: options.title ?? parsed.title,
        groupId,
        document: remapAssets(parsed.document, imageIdMap, fontIdMap),
        ...(parsed.target === undefined ? {} : { target: parsed.target }),
      });
    },
  );

  return { resume, report };
};
