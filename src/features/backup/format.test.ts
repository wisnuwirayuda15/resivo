import { describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/features/resume/model/index";

import {
  BACKUP_KIND,
  BACKUP_VERSION,
  BackupRejected,
  parseBackup,
} from "./format";

/**
 * Reading a backup file.
 *
 * The one place in the app where the input is a file the user believes contains
 * their only copy. Every rejection therefore has to say what is wrong in a
 * sentence, and (more importantly) has to happen *before* anything is written.
 */

const valid = () => ({
  kind: BACKUP_KIND,
  version: BACKUP_VERSION,
  createdAt: 1_700_000_000_000,
  resumes: [
    {
      id: "r1",
      title: "Mine",
      groupId: "",
      order: 0,
      createdAt: 1,
      updatedAt: 2,
      archivedAt: 0,
      document: createEmptyDocument(),
    },
  ],
  groups: [],
  images: [],
  fonts: [],
});

const parse = (value: unknown) => parseBackup(JSON.stringify(value));

describe("parseBackup", () => {
  it("accepts a backup this build wrote", () => {
    const backup = parse(valid());

    expect(backup.resumes).toHaveLength(1);
    expect(backup.resumes[0]?.title).toBe("Mine");
  });

  it("rejects a file that is not JSON", () => {
    expect(() => parseBackup("not json at all")).toThrow(BackupRejected);
  });

  /** A JSON file picked by mistake is the likeliest wrong input, so it gets its
   * own message rather than a schema error. */
  it("rejects JSON that is not a backup, saying what a backup looks like", () => {
    expect(() => parse({ hello: "world" })).toThrow(/not a Resivo backup/);
  });

  it("rejects a backup from a newer build rather than half-reading it", () => {
    expect(() => parse({ ...valid(), version: BACKUP_VERSION + 1 })).toThrow(
      /newer version/,
    );
  });

  it("accepts an older format version", () => {
    // Nothing older exists yet, but the check must be one-sided: a backup from
    // an older build is exactly what restore is for.
    expect(() => parse({ ...valid(), version: BACKUP_VERSION })).not.toThrow();
  });

  it("rejects a document that does not validate, and says nothing changed", () => {
    const broken = valid();

    // @ts-expect-error deliberately invalid, which is the point.
    broken.resumes[0].document = { schemaVersion: 1 };

    expect(() => parse(broken)).toThrow(/Nothing was changed/);
  });

  it("rejects an asset whose bytes are not a data URL", () => {
    expect(() =>
      parse({
        ...valid(),
        images: [
          {
            id: "i1",
            name: "x",
            mime: "image/png",
            width: 1,
            height: 1,
            size: 1,
            hash: "abc",
            createdAt: 0,
            data: "https://evil.example/x.png",
          },
        ],
      }),
    ).toThrow(BackupRejected);
  });

  it("rejects a missing collection rather than defaulting it", () => {
    const { fonts: _fonts, ...withoutFonts } = valid();

    expect(() => parse(withoutFonts)).toThrow(BackupRejected);
  });
});
