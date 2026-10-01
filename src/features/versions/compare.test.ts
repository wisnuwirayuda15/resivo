import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { createSampleDocument } from "@/features/resume/sample";
import {
  createEmptyDocument,
  plainText,
  text,
} from "@/features/resume/model/index";

import { compareDocuments } from "./compare";

import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * One document, cloned for each use. The example resume makes fresh ids every time
 * it is built, so two calls to it are two unrelated documents, which is exactly
 * what a comparison by identity must not be given when it means one.
 */
const ORIGINAL = createSampleDocument("classic");
const base = (): ResumeDocument => structuredClone(ORIGINAL);

const edit = (recipe: (draft: ResumeDocument) => void): ResumeDocument =>
  produce(base(), recipe);

/** The same document, as a version keeps it: a clone with every id intact. */
const clone = (): ResumeDocument => structuredClone(base());

const experience = (document: ResumeDocument) => {
  const found = document.content.sections.find(
    (section) => section.kind === "experience",
  );

  if (found === undefined) {
    throw new Error("no experience section in the example");
  }

  return found;
};

describe("compareDocuments", () => {
  it("finds a clone identical, which is what a fresh version is", () => {
    const result = compareDocuments(base(), clone());

    expect(result).toMatchObject({
      identical: true,
      noSharedIdentity: false,
      header: [],
      settings: [],
      sections: [],
    });
    expect(result.unchangedSections).toBe(base().content.sections.length);
  });

  it("reports a reworded paragraph word by word", () => {
    const after = edit((draft) => {
      const block = draft.content.sections[0]?.blocks[0];

      if (block?.kind === "paragraph") {
        block.text = text("Mathematician working on mechanical computation.");
      }
    });
    const result = compareDocuments(base(), after);
    const change = result.sections[0]?.blocks[0];

    expect(result.identical).toBe(false);
    expect(result.sections).toHaveLength(1);
    expect(change?.status).toBe("changed");
    expect(change?.words?.some((part) => part.type === "removed")).toBe(true);
    expect(change?.words?.[0]).toEqual({
      type: "same",
      text: "Mathematician working on mechanical computation.",
    });
  });

  it("reports a bullet added to an entry as a change to that entry", () => {
    const after = edit((draft) => {
      const entry = experience(draft).blocks.find(
        (block) => block.kind === "entry",
      );

      if (entry?.kind === "entry") {
        entry.bullets.push(text("Reviewed the Analytical Engine for Acme"));
      }
    });
    const change = compareDocuments(base(), after).sections[0]?.blocks[0];

    expect(change?.status).toBe("changed");
    expect(
      change?.words?.find((part) => part.type === "added")?.text,
    ).toContain("Reviewed the Analytical Engine for Acme");
  });

  it("reports added and removed blocks and sections", () => {
    const after = edit((draft) => {
      const section = experience(draft);

      section.blocks.splice(0, 1);
      section.blocks.push({
        id: "new-paragraph",
        kind: "paragraph",
        text: text("A new paragraph"),
      });
      draft.content.sections.push({
        id: "new-section",
        kind: "custom",
        title: text("Talks"),
        blocks: [{ id: "t1", kind: "paragraph", text: text("Gave a talk") }],
      });
      draft.content.sections = draft.content.sections.filter(
        (candidate) => candidate.kind !== "interests",
      );
    });
    const result = compareDocuments(base(), after);
    const talks = result.sections.find((section) => section.title === "Talks");
    const experienceChange = result.sections.find(
      (section) => section.id === experience(base()).id,
    );

    expect(talks?.status).toBe("added");
    expect(talks?.blocks).toEqual([
      expect.objectContaining({ status: "added", text: "Gave a talk" }),
    ]);
    expect(
      experienceChange?.blocks.map((block) => block.status).sort(),
    ).toEqual(["added", "removed"]);
  });

  it("reports a removed section with everything in it as removed", () => {
    const after = edit((draft) => {
      draft.content.sections = draft.content.sections.filter(
        (candidate) => candidate.kind !== "skills",
      );
    });
    const removed = compareDocuments(base(), after).sections.filter(
      (section) => section.status === "removed",
    );

    expect(removed).toHaveLength(1);
    expect(removed[0]?.blocks.length).toBeGreaterThan(0);
    expect(
      removed[0]?.blocks.every((block) => block.status === "removed"),
    ).toBe(true);
  });

  it("reports a section hidden, renamed and moved, and only moves what moved", () => {
    const original = base();
    const after = structuredClone(original);
    const [first, ...rest] = after.content.sections;

    if (first === undefined) {
      throw new Error("no sections");
    }

    // One section to the end: the others did not move, and are not reported.
    after.content.sections = [...rest, first];

    const second = after.content.sections[0];

    if (second !== undefined) {
      second.hidden = true;
      second.title = text("Work");
    }

    const result = compareDocuments(original, after);
    const moved = result.sections
      .filter((section) => section.moved)
      .map((section) => section.id);

    expect(moved).toEqual([first.id]);
    expect(
      result.sections.find((section) => section.id === second?.id),
    ).toMatchObject({
      visibility: "hidden",
      renamed: { to: "Work" },
    });
  });

  it("reports the header and the settings", () => {
    const after = edit((draft) => {
      draft.content.header.headline = text("Programmer for Acme");
      draft.templateId = "bold";
      draft.customCss = ".rp-name { color: red }";
      draft.content.header.contacts.pop();
    });
    const result = compareDocuments(base(), after);

    expect(
      result.header.map((change) => [change.field, change.status]),
    ).toEqual([
      ["headline", "changed"],
      ["contact", "removed"],
    ]);
    expect(result.settings).toEqual(["template", "customCss"]);
  });

  it("calls a format-only change a change, so it is never shown as none", () => {
    const after = edit((draft) => {
      const block = draft.content.sections[0]?.blocks[0];

      if (block?.kind === "paragraph") {
        block.text = [
          { type: "text", text: plainText(block.text), marks: ["bold"] },
        ];
      }
    });
    const change = compareDocuments(base(), after).sections[0]?.blocks[0];

    expect(change?.status).toBe("changed");
    expect(change?.formatOnly).toBe(true);
  });

  it("says when two documents share nothing, instead of listing everything", () => {
    const stranger = createEmptyDocument("classic");

    stranger.content.sections[0]?.blocks.push({
      id: "x",
      kind: "paragraph",
      text: text("Something else"),
    });

    const result = compareDocuments(base(), stranger);

    expect(result.noSharedIdentity).toBe(true);
    expect(result.identical).toBe(false);
  });
});
