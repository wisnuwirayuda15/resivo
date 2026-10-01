import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * Row shapes for the local database.
 *
 * Kept separate from the document model on purpose: the model is what a resume
 * *is*, these are how rows are *stored*. Timestamps are epoch milliseconds
 * because IndexedDB can index numbers but not `Date` ranges usefully.
 */

/**
 * "Not in a group".
 *
 * IndexedDB cannot index `null` or `undefined` (a row with a null key is simply
 * absent from that index), so the ungrouped state is an empty string rather than
 * `null`. That keeps both the `groupId` index and the `[groupId+order]` compound
 * index able to see every resume.
 */
export const UNGROUPED = "";

/**
 * "Not archived", for the same reason as `UNGROUPED`. Using `0` rather than
 * `null` also makes `archivedAt` range-queryable ("archived before X").
 */
export const NOT_ARCHIVED = 0;

/**
 * What a version of a resume is for: the job it was written to answer.
 *
 * Free text, because a company and a role are whatever the posting called them,
 * and an optional link back to the posting, which is the one thing someone
 * preparing for an interview will want to reopen.
 */
export interface ResumeTarget {
  company: string;
  role: string;
  url?: string;
}

export interface ResumeRecord {
  id: string;
  /** Group id, or `UNGROUPED`. Never null, see `UNGROUPED`. */
  groupId: string;
  /** Editable name, independent of the resume's own header. */
  title: string;
  /**
   * The whole document, stored inline via structured clone rather than
   * normalized across tables. A resume is edited as one unit, so autosave stays
   * a single `put` and an undo snapshot stays a single object.
   */
  document: ResumeDocument;
  /** Position within its group. */
  order: number;
  createdAt: number;
  updatedAt: number;
  /** Timestamp once archived, or `NOT_ARCHIVED`. Archived resumes are hidden
   * from the library, never deleted. */
  archivedAt: number;
  /**
   * The resume this one is a version of, when it is one.
   *
   * Always the root, never another version: a version made from a version still
   * points at the resume the family started from, so there is one level of
   * "versions of" and not a tree to walk. Absent for an ordinary resume, which
   * is every row written before this existed. Not indexed, so adding it needed
   * no Dexie version, and the library filters in memory as it already does.
   */
  baseId?: string;
  /** The job a version answers. Survives the base being deleted: the version is
   * still written for that job, it is just no longer linked to anything. */
  target?: ResumeTarget;
}

export interface GroupRecord {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  name: string;
  /** Stored as a native Blob: structured clone persists it efficiently, where
   * base64 would inflate it by a third and force string work on every read. */
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  /** Bytes. Denormalized so the gallery can total usage without reading blobs. */
  size: number;
  /** SHA-256 of the bytes, dedupes re-uploads and detects duplicates on
   * import, independent of id. */
  hash: string;
  createdAt: number;
}

export interface FontRecord {
  id: string;
  /** CSS family name, as referenced by `FontRef.family`. */
  family: string;
  weight: number;
  style: "normal" | "italic";
  /** Not indexed, so widening this needs no schema version bump. */
  format: "woff2" | "woff" | "ttf" | "otf";
  blob: Blob;
  size: number;
  createdAt: number;
}

/** Loose key/value store for application settings and UI preferences. */
export interface SettingRecord {
  key: string;
  value: unknown;
}
