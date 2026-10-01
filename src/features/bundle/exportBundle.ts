import { strToU8, zipSync } from "fflate";

import { fontRepo, imageRepo } from "@/database/index";
import {
  documentFontIds,
  documentImageIds,
} from "@/features/assets/references";
import { serializeDocument } from "@/features/markdown/index";
import { resolveTemplate } from "@/features/templates/registry";

import {
  BUNDLE_KIND,
  BUNDLE_VERSION,
  MANIFEST_FILE,
  MARKDOWN_FILE,
  RESUME_FILE,
} from "./format";

import type { Zippable } from "fflate";
import type { ResumeDocument } from "@/features/resume/model/document";
import type {
  BundleFontMeta,
  BundleImageMeta,
  BundleManifest,
  BundleResumeFile,
} from "./format";

/**
 * One resume as a zip, with the files it uses.
 *
 * Only what the document refers to goes in, found the way the preview finds it,
 * so a bundle is the size of the resume and not of the device's gallery. The
 * built-in typefaces are not included: they ship with the app, and a bundle that
 * carried them would be megabytes of something every reader already has.
 *
 * Synchronous (`zipSync`) on purpose. The async form starts a worker from a blob
 * URL, which is a second moving part in a build that is otherwise offline and
 * cached by a service worker, and a resume is a few megabytes at the outside.
 */

/** The extension an image is stored under, from the type the app accepts. */
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Formats that are already compressed, which deflate cannot shrink and only
 * costs time on. Stored as they are.
 */
const STORED = new Set(["png", "jpg", "webp", "gif", "woff", "woff2"]);

/** `images/<id>.png`, falling back to the index when an id is not a safe name.
 * Ids are opaque and an imported document may carry any non-empty one. */
const entryName = (
  folder: "images" | "fonts",
  id: string,
  index: number,
  extension: string,
): string =>
  `${folder}/${/^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : String(index)}.${extension}`;

export const buildResumeBundle = async (
  resume: { title: string; document: ResumeDocument },
  now: number,
): Promise<Blob> => {
  const { document } = resume;
  const files: Zippable = {};

  const images: Array<BundleImageMeta> = [];

  for (const [index, id] of documentImageIds(document).entries()) {
    const record = await imageRepo.getImage(id);

    // A reference to a row that is gone is carried as it is, which is what the
    // paper draws too: the same placeholder rather than a bundle that refuses.
    if (record === undefined) {
      continue;
    }

    const extension = IMAGE_EXTENSIONS[record.mime] ?? "bin";
    const file = entryName("images", id, index, extension);

    files[file] = [
      new Uint8Array(await record.blob.arrayBuffer()),
      { level: STORED.has(extension) ? 0 : 6 },
    ];
    images.push({
      id,
      file,
      name: record.name,
      mime: record.mime,
      width: record.width,
      height: record.height,
      hash: record.hash,
    });
  }

  const fonts: Array<BundleFontMeta> = [];

  for (const [index, id] of documentFontIds(document).entries()) {
    const record = await fontRepo.getFont(id);

    if (record === undefined) {
      continue;
    }

    const file = entryName("fonts", id, index, record.format);

    files[file] = [
      new Uint8Array(await record.blob.arrayBuffer()),
      { level: STORED.has(record.format) ? 0 : 6 },
    ];
    fonts.push({
      id,
      file,
      family: record.family,
      weight: record.weight,
      style: record.style,
      format: record.format,
    });
  }

  const manifest: BundleManifest = {
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    createdAt: now,
    template: {
      id: document.templateId,
      version: resolveTemplate(document.templateId).version,
    },
  };

  const resumeFile: BundleResumeFile = {
    title: resume.title,
    document,
    images,
    fonts,
  };

  files[MANIFEST_FILE] = strToU8(`${JSON.stringify(manifest, null, 2)}\n`);
  files[RESUME_FILE] = strToU8(`${JSON.stringify(resumeFile, null, 2)}\n`);
  // For a person with an archive tool. Nothing reads it back, so editing it in
  // the zip cannot create a second source of truth.
  files[MARKDOWN_FILE] = strToU8(serializeDocument(document));

  return new Blob([zipSync(files, { mtime: new Date(now) })], {
    type: "application/zip",
  });
};
