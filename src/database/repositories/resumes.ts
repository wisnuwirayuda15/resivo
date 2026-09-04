import { createId } from "@/lib/id";
import { createEmptyDocument, syncMeta } from "@/features/resume/model/index";

import { getDb } from "../db";
import { migrateDocument } from "../migrations/documents";
import { NOT_ARCHIVED, UNGROUPED } from "../records";

import type {
  ResumeDocument,
  TemplateId,
} from "@/features/resume/model/document";
import type { ResumeRecord } from "../records";

/**
 * Resume rows.
 *
 * Reads go through `migrateDocument`, so callers always receive a document at
 * the current format. Writes are plain `put`s, the whole document is one row,
 * which is what lets autosave be a single write.
 */

/** Everything the library needs to render a card, minus the document itself. */
export type ResumeSummary = Omit<ResumeRecord, "document"> & {
  /** Denormalized from the document so the list can search without parsing it. */
  fullName: string;
  headline?: string;
  templateId: TemplateId;
};

const toSummary = (record: ResumeRecord): ResumeSummary => {
  const { document, ...rest } = record;

  return {
    ...rest,
    fullName: document.meta.fullName,
    ...(document.meta.headline === undefined
      ? {}
      : { headline: document.meta.headline }),
    templateId: document.templateId,
  };
};

/** Active resumes, newest edit first. */
export const listResumes = async (): Promise<Array<ResumeSummary>> => {
  const records = await getDb()
    .resumes.where("archivedAt")
    .equals(NOT_ARCHIVED)
    .toArray();

  return records.sort((a, b) => b.updatedAt - a.updatedAt).map(toSummary);
};

/** Archived resumes, most recently archived first. */
export const listArchivedResumes = async (): Promise<Array<ResumeSummary>> => {
  const records = await getDb()
    .resumes.where("archivedAt")
    .above(NOT_ARCHIVED)
    .reverse()
    .toArray();

  return records.map(toSummary);
};

/** A group's active resumes in their manual order, straight off the compound
 * index, no JavaScript sort. */
export const listResumesInGroup = async (
  groupId: string,
): Promise<Array<ResumeSummary>> => {
  const records = await getDb()
    .resumes.where("[groupId+order]")
    .between([groupId, -Infinity], [groupId, Infinity])
    .toArray();

  return records
    .filter((record) => record.archivedAt === NOT_ARCHIVED)
    .map(toSummary);
};

/**
 * One resume, with its document migrated to the current format.
 *
 * When a migration ran, the upgraded document is written straight back so the
 * work is not repeated on every open.
 */
export const getResume = async (
  id: string,
): Promise<ResumeRecord | undefined> => {
  const record = await getDb().resumes.get(id);

  if (record === undefined) {
    return undefined;
  }

  const { document, migrated } = migrateDocument(record.document);
  const upgraded: ResumeRecord = { ...record, document };

  if (migrated) {
    await getDb().resumes.put(upgraded);
  }

  return upgraded;
};

export interface CreateResumeInput {
  title?: string;
  groupId?: string;
  templateId?: TemplateId;
  /**
   * The document to store. The new-resume dialog always supplies one, because
   * it is the thing that knows whether the user asked for the example or a
   * blank page; the fallback below covers a caller with nothing to say about
   * the content, which is what a test and a bare "new resume" are.
   */
  document?: ResumeDocument;
}

/** Appends after the last resume in the target group. */
const nextOrder = async (groupId: string): Promise<number> => {
  const last = await getDb()
    .resumes.where("[groupId+order]")
    .between([groupId, -Infinity], [groupId, Infinity])
    .last();

  return last === undefined ? 0 : last.order + 1;
};

export const createResume = async (
  input: CreateResumeInput = {},
): Promise<ResumeRecord> => {
  const now = Date.now();
  const groupId = input.groupId ?? UNGROUPED;
  const document =
    input.document ?? createEmptyDocument(input.templateId ?? "classic");

  const record: ResumeRecord = {
    id: createId(),
    groupId,
    title: input.title ?? "Untitled resume",
    document: syncMeta(document),
    order: await nextOrder(groupId),
    createdAt: now,
    updatedAt: now,
    archivedAt: NOT_ARCHIVED,
  };

  await getDb().resumes.add(record);

  return record;
};

/**
 * Persists an edited document. This is the autosave write path, so it does the
 * minimum: refresh the denormalized metadata, stamp `updatedAt`, one `put`.
 *
 * Returns the row it wrote, rather than nothing. The caller needs to know what
 * landed, not what it asked for: `syncMeta` rewrites part of the document and
 * `updatedAt` is decided here, so a caller reconstructing the saved row would be
 * guessing at both. The query cache is updated from this, see
 * `patchSavedResume`.
 */
export const saveResumeDocument = async (
  id: string,
  document: ResumeDocument,
): Promise<ResumeRecord> => {
  const db = getDb();

  return db.transaction("rw", db.resumes, async () => {
    const existing = await db.resumes.get(id);

    if (existing === undefined) {
      throw new Error(`Resume ${id} no longer exists.`);
    }

    const saved: ResumeRecord = {
      ...existing,
      document: syncMeta(document),
      updatedAt: Date.now(),
    };

    await db.resumes.put(saved);

    return saved;
  });
};

/** Patches row-level fields. Does not touch the document. */
export const updateResume = async (
  id: string,
  changes: Partial<Pick<ResumeRecord, "title" | "groupId" | "order">>,
): Promise<void> => {
  await getDb().resumes.update(id, { ...changes, updatedAt: Date.now() });
};

export const duplicateResume = async (
  id: string,
): Promise<ResumeRecord | undefined> => {
  const source = await getResume(id);

  if (source === undefined) {
    return undefined;
  }

  return createResume({
    title: `${source.title} copy`,
    groupId: source.groupId,
    // Structured-cloned so the copy shares no nested objects with the original.
    document: structuredClone(source.document),
  });
};

export const archiveResume = async (id: string): Promise<void> => {
  const now = Date.now();

  await getDb().resumes.update(id, { archivedAt: now, updatedAt: now });
};

export const restoreResume = async (id: string): Promise<void> => {
  await getDb().resumes.update(id, {
    archivedAt: NOT_ARCHIVED,
    updatedAt: Date.now(),
  });
};

export const deleteResume = async (id: string): Promise<void> => {
  await getDb().resumes.delete(id);
};

/**
 * Applies a new ordering within a group in one transaction, so the list never
 * renders a half-reordered state.
 */
export const reorderResumes = async (
  orderedIds: Array<string>,
): Promise<void> => {
  const db = getDb();

  await db.transaction("rw", db.resumes, async () => {
    await Promise.all(
      orderedIds.map((id, order) => db.resumes.update(id, { order })),
    );
  });
};

/**
 * Every image id referenced by any resume.
 *
 * Backs the gallery's "unused image" view, and is why deleting an image is a
 * deliberate action rather than automatic cleanup.
 */
export const collectReferencedImageIds = async (): Promise<Set<string>> => {
  const referenced = new Set<string>();

  await getDb().resumes.each((record) => {
    const { header, sections } = record.document.content;

    if (header.avatarImageId !== undefined) {
      referenced.add(header.avatarImageId);
    }

    for (const section of sections) {
      for (const block of section.blocks) {
        if (block.kind === "image") {
          referenced.add(block.imageId);
        }
      }
    }
  });

  return referenced;
};

/** Every custom font id referenced by any resume, for the same reason. */
export const collectReferencedFontIds = async (): Promise<Set<string>> => {
  const referenced = new Set<string>();

  await getDb().resumes.each((record) => {
    const { bodyFont, headingFont } = record.document.design.typography;

    for (const font of [bodyFont, headingFont]) {
      if (font?.source === "custom" && font.fontId !== undefined) {
        referenced.add(font.fontId);
      }
    }
  });

  return referenced;
};
