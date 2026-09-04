import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/features/resume/model/index";
import { __setDbForTesting } from "@/database/db";
import { createId } from "@/lib/id";

import { createBackup, restoreBackup } from "./backup";

import type { Backup } from "./format";
import type { ResivoDB } from "@/database/db";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * Backup and restore against a real IndexedDB.
 *
 * The rule under test is the one that matters: a restore adds and never
 * replaces. A backup is usually reached for when something has already gone
 * wrong, so the failure this suite exists to prevent is a restore that turns one
 * lost resume into all of them.
 */

let db: ResivoDB;

beforeEach(() => {
  db = __setDbForTesting(`resivo-backup-test-${createId()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const NOW = 1_700_000_000_000;

/** A 1×1 PNG, small enough to read in a diff. */
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const addResume = async (id: string, title: string, doc?: ResumeDocument) => {
  await db.resumes.add({
    id,
    title,
    groupId: "",
    order: 0,
    createdAt: 1,
    updatedAt: 2,
    archivedAt: 0,
    document: doc ?? createEmptyDocument(),
  });
};

const addImage = async (id: string, hash: string) => {
  await db.images.add({
    id,
    name: "photo",
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    mime: "image/png",
    width: 1,
    height: 1,
    size: 3,
    hash,
    createdAt: 0,
  });
};

const backupWith = (overrides: Partial<Backup>): Backup => ({
  kind: "resivo.backup",
  version: 1,
  createdAt: NOW,
  resumes: [],
  groups: [],
  images: [],
  fonts: [],
  ...overrides,
});

describe("createBackup", () => {
  it("captures resumes, groups and assets", async () => {
    await addResume("r1", "Mine");
    await db.groups.add({
      id: "g1",
      name: "Applications",
      order: 0,
      createdAt: 0,
    });
    await addImage("i1", "hash-a");

    const backup = await createBackup(NOW);

    expect(backup.kind).toBe("resivo.backup");
    expect(backup.createdAt).toBe(NOW);
    expect(backup.resumes.map((r) => r.id)).toEqual(["r1"]);
    expect(backup.groups.map((g) => g.id)).toEqual(["g1"]);
    expect(backup.images[0]?.data.startsWith("data:")).toBe(true);
  });

  it("captures an archived resume too", async () => {
    await addResume("r1", "Old");
    await db.resumes.update("r1", { archivedAt: NOW });

    expect((await createBackup(NOW)).resumes[0]?.archivedAt).toBe(NOW);
  });

  it("writes an empty but valid backup for an empty database", async () => {
    const backup = await createBackup(NOW);

    expect(backup.resumes).toEqual([]);
    expect(backup.images).toEqual([]);
  });
});

describe("restoreBackup", () => {
  it("adds resumes that are not there", async () => {
    const report = await restoreBackup(
      backupWith({
        resumes: [
          {
            id: "r1",
            title: "Restored",
            groupId: "",
            order: 0,
            createdAt: 1,
            updatedAt: 2,
            archivedAt: 0,
            document: createEmptyDocument(),
          },
        ],
      }),
      NOW,
    );

    expect(report.resumesAdded).toBe(1);
    expect((await db.resumes.get("r1"))?.title).toBe("Restored");
  });

  /** The rule. A collision keeps both copies, because the user is the only one
   * who knows which is the good one. */
  it("keeps an existing resume and restores the backup copy beside it", async () => {
    await addResume("r1", "The one I still have");

    const report = await restoreBackup(
      backupWith({
        resumes: [
          {
            id: "r1",
            title: "The one from the backup",
            groupId: "",
            order: 0,
            createdAt: 1,
            updatedAt: 2,
            archivedAt: 0,
            document: createEmptyDocument(),
          },
        ],
      }),
      NOW,
    );

    const all = await db.resumes.toArray();

    expect(report.resumesRenumbered).toBe(1);
    expect(all).toHaveLength(2);
    expect((await db.resumes.get("r1"))?.title).toBe("The one I still have");
    expect(all.map((r) => r.title)).toContain(
      "The one from the backup (restored)",
    );
  });

  it("stamps a restored resume as changed now, so it is not buried", async () => {
    await restoreBackup(
      backupWith({
        resumes: [
          {
            id: "r1",
            title: "Old",
            groupId: "",
            order: 0,
            createdAt: 1,
            updatedAt: 5,
            archivedAt: 0,
            document: createEmptyDocument(),
          },
        ],
      }),
      NOW,
    );

    expect((await db.resumes.get("r1"))?.updatedAt).toBe(NOW);
  });

  it("does not duplicate an image whose bytes are already stored", async () => {
    await addImage("i1", "hash-a");

    const report = await restoreBackup(
      backupWith({
        images: [
          {
            id: "other-id",
            name: "photo",
            mime: "image/png",
            width: 1,
            height: 1,
            size: 3,
            hash: "hash-a",
            createdAt: 0,
            data: PNG,
          },
        ],
      }),
      NOW,
    );

    expect(report.imagesAlreadyPresent).toBe(1);
    expect(await db.images.count()).toBe(1);
  });

  /**
   * The consequence of deduplicating: the restored document must be pointed at
   * the row that was kept, or the resume shows a missing-image box for a picture
   * that is right there.
   */
  it("repoints a restored document at the deduplicated image", async () => {
    await addImage("kept", "hash-a");

    const document = createEmptyDocument();

    document.content.header.avatarImageId = "from-backup";
    document.content.sections[0]?.blocks.push({
      id: "b1",
      kind: "image",
      imageId: "from-backup",
      alt: "",
    });

    await restoreBackup(
      backupWith({
        images: [
          {
            id: "from-backup",
            name: "photo",
            mime: "image/png",
            width: 1,
            height: 1,
            size: 3,
            hash: "hash-a",
            createdAt: 0,
            data: PNG,
          },
        ],
        resumes: [
          {
            id: "r1",
            title: "With a photo",
            groupId: "",
            order: 0,
            createdAt: 1,
            updatedAt: 2,
            archivedAt: 0,
            document,
          },
        ],
      }),
      NOW,
    );

    const restored = await db.resumes.get("r1");
    const block = restored?.document.content.sections[0]?.blocks[0];

    expect(restored?.document.content.header.avatarImageId).toBe("kept");
    expect(block?.kind === "image" && block.imageId).toBe("kept");
  });

  it("decodes an image back to a blob of the right type", async () => {
    await restoreBackup(
      backupWith({
        images: [
          {
            id: "i1",
            name: "photo",
            mime: "image/png",
            width: 1,
            height: 1,
            size: 70,
            hash: "hash-new",
            createdAt: 0,
            data: PNG,
          },
        ],
      }),
      NOW,
    );

    const stored = await db.images.get("i1");

    expect(stored?.blob.type).toBe("image/png");
    expect(stored?.blob.size).toBeGreaterThan(0);
  });

  /** A font is identified by what a `@font-face` rule keys on. Two rows differing
   * only by id would declare the same face twice. */
  it("does not duplicate a font of the same family, weight and style", async () => {
    await db.fonts.add({
      id: "f1",
      family: "Probe",
      weight: 400,
      style: "normal",
      format: "woff2",
      blob: new Blob([new Uint8Array([1])]),
      size: 1,
      createdAt: 0,
    });

    const report = await restoreBackup(
      backupWith({
        fonts: [
          {
            id: "f2",
            family: "Probe",
            weight: 400,
            style: "normal",
            format: "woff2",
            size: 1,
            createdAt: 0,
            data: "data:font/woff2;base64,AAAA",
          },
        ],
      }),
      NOW,
    );

    expect(report.fontsAlreadyPresent).toBe(1);
    expect(await db.fonts.count()).toBe(1);
  });

  it("keeps a font of the same family in a different weight", async () => {
    await db.fonts.add({
      id: "f1",
      family: "Probe",
      weight: 400,
      style: "normal",
      format: "woff2",
      blob: new Blob([new Uint8Array([1])]),
      size: 1,
      createdAt: 0,
    });

    await restoreBackup(
      backupWith({
        fonts: [
          {
            id: "f2",
            family: "Probe",
            weight: 700,
            style: "normal",
            format: "woff2",
            size: 1,
            createdAt: 0,
            data: "data:font/woff2;base64,AAAA",
          },
        ],
      }),
      NOW,
    );

    expect(await db.fonts.count()).toBe(2);
  });

  it("restores a group, and keeps an existing one of the same id", async () => {
    await db.groups.add({ id: "g1", name: "Mine", order: 0, createdAt: 0 });

    const report = await restoreBackup(
      backupWith({
        groups: [
          { id: "g1", name: "From backup", order: 0, createdAt: 0 },
          { id: "g2", name: "New", order: 1, createdAt: 0 },
        ],
      }),
      NOW,
    );

    expect(report.groupsAdded).toBe(1);
    expect((await db.groups.get("g1"))?.name).toBe("Mine");
  });

  /** A resume filed under a group that exists nowhere would be invisible in the
   * library. Ungrouped is recoverable; invisible is not. */
  it("ungroups a resume whose group is missing", async () => {
    await restoreBackup(
      backupWith({
        resumes: [
          {
            id: "r1",
            title: "Orphan",
            groupId: "gone",
            order: 0,
            createdAt: 1,
            updatedAt: 2,
            archivedAt: 0,
            document: createEmptyDocument(),
          },
        ],
      }),
      NOW,
    );

    expect((await db.resumes.get("r1"))?.groupId).toBe("");
  });

  it("carries settings, and never replaces one the device already has", async () => {
    await db.settings.add({ key: "editor.lastTemplateId", value: "modern" });

    const report = await restoreBackup(
      backupWith({
        settings: [
          // The device has its own answer for this one, and a restore adds
          // rather than replaces, including for preferences.
          { key: "editor.lastTemplateId", value: "classic" },
          // A key this build does not know. Stored anyway: dropping it would
          // make a backup written by a newer build lossy on the way through.
          { key: "future.thing", value: 42 },
        ],
      }),
      NOW,
    );

    expect(report.settingsAdded).toBe(1);
    expect((await db.settings.get("editor.lastTemplateId"))?.value).toBe(
      "modern",
    );
    expect((await db.settings.get("future.thing"))?.value).toBe(42);
  });

  it("restores a file written before settings were carried", async () => {
    // `settings` is optional for exactly this: every backup taken until now has
    // no such key, and those files must still restore.
    const { settings, ...withoutSettings } = backupWith({
      groups: [{ id: "g1", name: "Old", order: 0, createdAt: 0 }],
    });

    expect(settings).toBeUndefined();

    const report = await restoreBackup(withoutSettings, NOW);

    expect(report.groupsAdded).toBe(1);
    expect(report.settingsAdded).toBe(0);
  });

  it("round-trips a database through a backup", async () => {
    await addResume("r1", "Mine");
    await addImage("i1", "hash-a");

    const backup = await createBackup(NOW);

    await db.resumes.clear();
    await db.images.clear();

    const report = await restoreBackup(backup, NOW);

    expect(report.resumesAdded).toBe(1);
    expect(report.imagesAdded).toBe(1);
    expect((await db.resumes.get("r1"))?.title).toBe("Mine");
    expect((await db.images.get("i1"))?.hash).toBe("hash-a");
  });

  /** Restoring the same file twice is a thing people do when unsure whether the
   * first one worked. It must not double the library. */
  it("does not duplicate assets when the same backup is restored twice", async () => {
    await addImage("i1", "hash-a");

    const backup = await createBackup(NOW);

    await restoreBackup(backup, NOW);
    await restoreBackup(backup, NOW);

    expect(await db.images.count()).toBe(1);
  });
});
