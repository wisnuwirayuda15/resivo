import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createSampleDocument,
  createSampleLetter,
} from "@/features/resume/sample";
import { createId } from "@/lib/id";

import { __setDbForTesting } from "./db";
import * as resumeRepo from "./repositories/resumes";

import type { ResivoDB } from "./db";

/**
 * Cover letters in the library: what the summary says they are, and the letter
 * made from a resume.
 */

let db: ResivoDB;

beforeEach(() => {
  db = __setDbForTesting(`resivo-letters-test-${createId()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("the library's view of a letter", () => {
  it("says what each row is, and a row from before letters existed is a resume", async () => {
    await resumeRepo.createResume({
      title: "Master",
      document: createSampleDocument("classic"),
    });
    await resumeRepo.createResume({
      title: "A letter",
      document: createSampleLetter("classic"),
    });

    const kinds = Object.fromEntries(
      (await resumeRepo.listResumes()).map((row) => [row.title, row.kind]),
    );

    expect(kinds).toEqual({ Master: "resume", "A letter": "coverLetter" });
  });

  it("keeps the kind through a save", async () => {
    const letter = await resumeRepo.createResume({
      title: "A letter",
      document: createSampleLetter("classic"),
    });

    const saved = await resumeRepo.saveResumeDocument(
      letter.id,
      letter.document,
    );

    expect(saved.document.kind).toBe("coverLetter");
    expect((await resumeRepo.getResume(letter.id))?.document.kind).toBe(
      "coverLetter",
    );
  });
});

describe("createLetterFrom", () => {
  it("makes a letter with the header, in the same group", async () => {
    const resume = await resumeRepo.createResume({
      title: "Master",
      groupId: "applications",
      document: createSampleDocument("modern"),
    });
    const letter = await resumeRepo.createLetterFrom(
      resume.id,
      "Master cover letter",
    );

    expect(letter?.title).toBe("Master cover letter");
    expect(letter?.groupId).toBe("applications");
    expect(letter?.document.kind).toBe("coverLetter");
    expect(letter?.document.content.header).toEqual(
      resume.document.content.header,
    );
    // Not a version: a letter is not compared with the resume it began from.
    expect(letter).not.toHaveProperty("baseId");
    expect(letter).not.toHaveProperty("target");
  });

  it("takes the job a version was written for, as the recipient and as its own target", async () => {
    const base = await resumeRepo.createResume({
      title: "Master",
      document: createSampleDocument("classic"),
    });
    const version = await resumeRepo.createVersion(
      base.id,
      { company: "Acme", role: "Analyst" },
      "For Acme",
    );
    const letter = await resumeRepo.createLetterFrom(
      version?.id ?? "",
      "Letter",
    );
    const block = letter?.document.content.sections[0]?.blocks[0];

    expect(letter?.target).toEqual({ company: "Acme", role: "Analyst" });
    expect(block?.kind === "paragraph" ? block.text : null).toEqual([
      { type: "text", text: "Hiring Team, Acme" },
    ]);
    expect(letter).not.toHaveProperty("baseId");
  });

  it("returns nothing for a resume that is not there, and writes nothing", async () => {
    expect(await resumeRepo.createLetterFrom("missing", "x")).toBeUndefined();
    expect(await db.resumes.count()).toBe(0);
  });
});
