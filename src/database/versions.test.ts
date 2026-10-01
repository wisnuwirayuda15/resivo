import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createSampleDocument } from "@/features/resume/sample";
import { createId } from "@/lib/id";

import { __setDbForTesting, getDb } from "./db";
import * as resumeRepo from "./repositories/resumes";

import type { ResivoDB } from "./db";
import type { ResumeTarget } from "./records";

/**
 * Versions of a resume, against a real IndexedDB.
 *
 * The properties that matter are the ones a comparison and a delete lean on: a
 * version keeps the ids of what it was copied from, the link always points at
 * the root, and deleting what a family began from leaves the family standing.
 */

let db: ResivoDB;

beforeEach(() => {
  db = __setDbForTesting(`resivo-versions-test-${createId()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const ACME: ResumeTarget = {
  company: "Acme",
  role: "Analyst",
  url: "https://acme.example/jobs/1",
};

const makeBase = () =>
  resumeRepo.createResume({
    title: "Master",
    document: createSampleDocument("modern"),
  });

describe("createVersion", () => {
  it("copies the document with every section and block id intact", async () => {
    const base = await makeBase();
    const version = await resumeRepo.createVersion(base.id, ACME, "For Acme");

    expect(version).toBeDefined();
    expect(version?.id).not.toBe(base.id);
    expect(version?.title).toBe("For Acme");
    expect(version?.baseId).toBe(base.id);
    expect(version?.target).toEqual(ACME);

    const ids = (record: typeof base | undefined) =>
      record?.document.content.sections.flatMap((section) => [
        section.id,
        ...section.blocks.map((block) => block.id),
      ]);

    expect(ids(version)).toEqual(ids(base));
    expect(version?.document.content).toEqual(base.document.content);
  });

  it("shares no objects with what it was copied from", async () => {
    const base = await makeBase();
    const version = await resumeRepo.createVersion(base.id, ACME, "For Acme");

    const stored = await resumeRepo.getResume(base.id);
    const block = version?.document.content.sections[0]?.blocks[0];

    if (block?.kind === "paragraph") {
      block.text = [{ type: "text", text: "changed in the version" }];
    }

    await resumeRepo.saveResumeDocument(
      version?.id ?? "",
      version?.document ?? base.document,
    );

    const untouched = await resumeRepo.getResume(base.id);

    expect(untouched?.document).toEqual(stored?.document);
  });

  it("keeps it in the group of what it was made from", async () => {
    const base = await resumeRepo.createResume({
      title: "Master",
      groupId: "applications",
      document: createSampleDocument("classic"),
    });
    const version = await resumeRepo.createVersion(base.id, ACME, "For Acme");

    expect(version?.groupId).toBe("applications");
  });

  it("points a version of a version at the root, but copies the one it was given", async () => {
    const base = await makeBase();
    const first = await resumeRepo.createVersion(base.id, ACME, "For Acme");
    const block = first?.document.content.sections[0]?.blocks[0];

    if (block?.kind === "paragraph") {
      block.text = [{ type: "text", text: "tailored for Acme" }];
    }

    await resumeRepo.saveResumeDocument(
      first?.id ?? "",
      first?.document ?? base.document,
    );

    const second = await resumeRepo.createVersion(
      first?.id ?? "",
      { company: "Globex", role: "Engineer" },
      "For Globex",
    );
    const copied = second?.document.content.sections[0]?.blocks[0];

    expect(second?.baseId).toBe(base.id);
    expect(copied?.kind === "paragraph" ? copied.text : null).toEqual([
      { type: "text", text: "tailored for Acme" },
    ]);
  });

  it("returns nothing for a resume that is not there, and writes nothing", async () => {
    expect(
      await resumeRepo.createVersion("missing", ACME, "x"),
    ).toBeUndefined();
    expect(await db.resumes.count()).toBe(0);
  });

  it("is not what a plain duplicate does", async () => {
    const base = await makeBase();
    const copy = await resumeRepo.duplicateResume(base.id);

    expect(copy?.baseId).toBeUndefined();
    expect(copy?.target).toBeUndefined();
  });

  it("shows up in the library summary", async () => {
    const base = await makeBase();

    await resumeRepo.createVersion(base.id, ACME, "For Acme");

    const summaries = await resumeRepo.listResumes();
    const version = summaries.find((summary) => summary.baseId === base.id);

    expect(version?.target).toEqual(ACME);
    expect(
      summaries.find((summary) => summary.id === base.id)?.baseId,
    ).toBeUndefined();
  });
});

describe("deleteResume", () => {
  it("leaves the versions standing, unlinked, and still for their job", async () => {
    const base = await makeBase();
    const other = await makeBase();
    const version = await resumeRepo.createVersion(base.id, ACME, "For Acme");
    const unrelated = await resumeRepo.createVersion(
      other.id,
      ACME,
      "Elsewhere",
    );

    await resumeRepo.deleteResume(base.id);

    const kept = await getDb().resumes.get(version?.id ?? "");

    expect(await getDb().resumes.get(base.id)).toBeUndefined();
    expect(kept).toBeDefined();
    expect(kept).not.toHaveProperty("baseId");
    expect(kept?.target).toEqual(ACME);
    // Another family is not touched.
    expect((await getDb().resumes.get(unrelated?.id ?? ""))?.baseId).toBe(
      other.id,
    );
  });

  it("deletes a version without touching its base", async () => {
    const base = await makeBase();
    const version = await resumeRepo.createVersion(base.id, ACME, "For Acme");

    await resumeRepo.deleteResume(version?.id ?? "");

    expect(await getDb().resumes.get(base.id)).toBeDefined();
    expect(await getDb().resumes.count()).toBe(1);
  });
});
