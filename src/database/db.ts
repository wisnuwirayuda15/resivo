import Dexie from "dexie";

import { hasIndexedDb } from "@/lib/client";

import type { Table } from "dexie";
import type {
  FontRecord,
  GroupRecord,
  ImageRecord,
  ResumeRecord,
  SettingRecord,
} from "./records";

/**
 * The local database, the only place user data lives.
 *
 * Resivo keeps TanStack Start's SSR shell, but IndexedDB does not exist on the
 * server, so this module must never open a connection at import time. `getDb()`
 * is therefore lazy and throws on the server rather than returning a stub: a
 * route loader that accidentally runs server-side should fail loudly in
 * development instead of quietly rendering an empty library.
 */

export const DB_NAME = "resivo";

class ResivoDB extends Dexie {
  declare resumes: Table<ResumeRecord, string>;
  declare groups: Table<GroupRecord, string>;
  declare images: Table<ImageRecord, string>;
  declare fonts: Table<FontRecord, string>;
  declare settings: Table<SettingRecord, string>;

  constructor(name: string = DB_NAME) {
    super(name);

    /**
     * Schema v1.
     *
     * Only indexed fields are listed, Dexie stores the rest of each row
     * untouched, which is what keeps the inline `document` and the image/font
     * `blob` off the index and out of every query's way.
     *
     * `[groupId+order]` is a compound index so a group's resumes come back
     * already ordered, without a sort in JavaScript.
     */
    this.version(1).stores({
      resumes: "id, groupId, updatedAt, archivedAt, [groupId+order], title",
      groups: "id, order",
      images: "id, name, hash, createdAt",
      fonts: "id, family, createdAt",
      settings: "key",
    });
  }
}

let instance: ResivoDB | undefined;

/**
 * Opens (or returns) the database connection.
 *
 * Every repository goes through this rather than importing a module-level
 * instance, which is what keeps the connection from being created during server
 * rendering.
 */
export const getDb = (): ResivoDB => {
  if (!hasIndexedDb()) {
    throw new Error(
      "IndexedDB is unavailable. The Resivo database is browser-only, reach it " +
        "from a client-only boundary, and note that private browsing windows may " +
        "block it entirely.",
    );
  }

  instance ??= new ResivoDB();

  return instance;
};

/** True when the database can be reached, for rendering a graceful fallback
 * instead of throwing (private windows, locked-down webviews). */
export const isDbAvailable = (): boolean => hasIndexedDb();

/**
 * Test seam: swaps in a throwaway database and resets the memoized connection.
 * Production code never calls this.
 */
export const __setDbForTesting = (name: string): ResivoDB => {
  instance = new ResivoDB(name);

  return instance;
};

export type { ResivoDB };
